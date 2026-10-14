// frontend/src/pages/Landing2.jsx
import { useNavigate } from "react-router-dom";
import BASE_URL from "../api";
import { 
  FaInstagram, 
  FaFacebookF, 
  FaYoutube, 
  FaTiktok, 
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaChurch,
  FaMusic,
  FaLaptop,
  FaUsers,
  FaHandsHelping,
  FaHeart,
  FaPray,
  FaClock,
  FaLocationArrow,
  FaDownload,
  FaUserPlus,
  FaSignInAlt,
  FaBars,
  FaTimes,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaPause,
  FaImage,
  FaCalendarAlt,
  FaPlay,
  FaAppStore,
  FaAppStoreIos,
  FaGooglePlay
} from "react-icons/fa";
import { useEffect, useState, useRef } from "react";
import logo from "../assets/zuca-logo.png";
// Slideshow images 
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
import NotificationPrompt from '../components/NotificationPrompt';
import axios from 'axios';

function Landing2() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(true);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const heroRef = useRef(null);
  const aboutRef = useRef(null);
  const massRef = useRef(null);
  const connectRef = useRef(null);
  const contactRef = useRef(null);
  const mediaRef = useRef(null);      
const eventsRef = useRef(null);    
const hymnsRef = useRef(null);      
const youtubeRef = useRef(null);
  const slideIntervalRef = useRef(null);
  const slideshowRef = useRef(null);
  const [featuredMedia, setFeaturedMedia] = useState([]);
const [loadingMedia, setLoadingMedia] = useState(true);
const [selectedMedia, setSelectedMedia] = useState(null);
const [isModalOpen, setIsModalOpen] = useState(false);
const [latestVideo, setLatestVideo] = useState([]);
const [loadingVideo, setLoadingVideo] = useState(true);
const [upcomingEvents, setUpcomingEvents] = useState([]);
const [loadingEvents, setLoadingEvents] = useState(true);
const [hymns, setHymns] = useState([]);
const [loadingHymns, setLoadingHymns] = useState(true);
const [hymnSearch, setHymnSearch] = useState('');
const [searchResults, setSearchResults] = useState([]);
const [isSearching, setIsSearching] = useState(false);
const [selectedHymn, setSelectedHymn] = useState(null);
const [showHymnModal, setShowHymnModal] = useState(false);
const [hymnsPage, setHymnsPage] = useState(1);
const [hasMoreHymns, setHasMoreHymns] = useState(false);
const [searchSuggestions, setSearchSuggestions] = useState([]);
const [showSuggestions, setShowSuggestions] = useState(false);
const [isSearchingLive, setIsSearchingLive] = useState(false);
const [downloading, setDownloading] = useState(false);
const [loadingHymnDetails, setLoadingHymnDetails] = useState(false);
const [selectedVideo, setSelectedVideo] = useState(null);
const [showVideoModal, setShowVideoModal] = useState(false);

const [historyEntries, setHistoryEntries] = useState([]);
const [loadingHistory, setLoadingHistory] = useState(true);

  // Slideshow images array
  const slides = [
    { id: 2, image: slide2, title: "Community Prayer", description: "Join us in worship" },
    { id: 3, image: slide3, title: "Youth in Action", description: "Building a stronger faith community" },
    { id: 4, image: slide4, title: "Mass & Celebrations", description: "Come together in faith" },
    { id: 5, image: slide5, title: "Zetech Catholic Action", description: "Growing in faith and service" },
    { id: 6, image: slide6, title: "Zetech Catholic Action", description: "Growing in faith and service" },
    { id: 7, image: slide7, title: "Zetech Catholic Action", description: "Growing in faith and service" },
    { id: 8, image: slide8, title: "Zetech Catholic Action", description: "Growing in faith and service" },
    { id: 9, image: slide9, title: "Zetech Catholic Action", description: "Growing in faith and service" },
    { id: 10, image: slide10, title: "Zetech Catholic Action", description: "Growing in faith and service" },
    { id: 11, image: slide11, title: "Zetech Catholic Action", description: "Growing in faith and service" },
    { id: 12, image: slide12, title: "Zetech Catholic Action", description: "Growing in faith and service" }    

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

  const openMediaModal = (media) => {
  setSelectedMedia(media);
  setIsModalOpen(true);
  document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
};

const closeMediaModal = () => {
  setIsModalOpen(false);
  setSelectedMedia(null);
  document.body.style.overflow = 'auto'; // Restore scrolling
};



 // Fetch hymns
const fetchHymns = async (page = 1, search = '') => {
  try {
    if (search) {
      const response = await axios.get(`${BASE_URL}/api/public/hymns/search/${encodeURIComponent(search)}?limit=20`);
      if (response.data.success) {
        setSearchResults(response.data.hymns);
        setIsSearching(true);
      }
    } else {
      const response = await axios.get(`${BASE_URL}/api/public/hymns?page=${page}&limit=12`);
      if (response.data.success) {
        if (page === 1) {
          setHymns(response.data.hymns);
        } else {
          setHymns(prev => [...prev, ...response.data.hymns]);
        }
        setHasMoreHymns(response.data.hasMore);
      }
    }
  } catch (err) {
    console.error('Error fetching hymns:', err);
  } finally {
    setLoadingHymns(false);
  }
};

// View hymn details
const viewHymn = async (id) => {
  try {
    setLoadingHymnDetails(true);
    const response = await axios.get(`${BASE_URL}/api/public/hymns/${id}`);
    if (response.data.success) {
      setSelectedHymn(response.data.hymn);
      setShowHymnModal(true);
      document.body.style.overflow = 'hidden';
    }
  } catch (err) {
    console.error('Error fetching hymn details:', err);
    alert('Failed to load hymn details. Please try again.');
  } finally {
    setLoadingHymnDetails(false);
  }
};

const closeHymnModal = () => {
  setShowHymnModal(false);
  setSelectedHymn(null);
  document.body.style.overflow = 'auto';
};

const handleHymnSearch = (e) => {
  e.preventDefault();
  if (hymnSearch.trim().length >= 2) {
    setLoadingHymns(true);
    setIsSearching(true);
    fetchHymns(1, hymnSearch);
  }
};

const clearSearch = () => {
  setHymnSearch('');
  setIsSearching(false);
  setSearchResults([]);
  setLoadingHymns(true);
  fetchHymns(1, '');
};

const loadMoreHymns = () => {
  if (hasMoreHymns && !isSearching) {
    const nextPage = hymnsPage + 1;
    setHymnsPage(nextPage);
    fetchHymns(nextPage, '');
  }
};

// Live search as user types
const handleSearchInput = async (e) => {
  const value = e.target.value;
  setHymnSearch(value);
  
  if (value.trim().length >= 2) {
    setIsSearchingLive(true);
    setShowSuggestions(true);
    
    try {
      const response = await axios.get(`${BASE_URL}/api/public/hymns/search/${encodeURIComponent(value)}?limit=8`);
      if (response.data.success) {
        setSearchSuggestions(response.data.hymns);
      }
    } catch (err) {
      console.error('Live search error:', err);
      setSearchSuggestions([]);
    } finally {
      setIsSearchingLive(false);
    }
  } else {
    setShowSuggestions(false);
    setSearchSuggestions([]);
  }
};

const selectSuggestion = async (suggestion) => {
  setHymnSearch(suggestion.title);
  setShowSuggestions(false);
  setIsSearching(true);
  setLoadingHymns(true);
  
  // Fetch the hymn immediately
  try {
    const response = await axios.get(`${BASE_URL}/api/public/hymns/search/${encodeURIComponent(suggestion.title)}?limit=20`);
    if (response.data.success) {
      setSearchResults(response.data.hymns);
    }
  } catch (err) {
    console.error('Error fetching suggested hymn:', err);
  } finally {
    setLoadingHymns(false);
  }
};


// Download hymn as Image
const downloadHymnAsImage = async (hymn) => {
  try {
    setDownloading(true);
    
    // Create a temporary container for the hymn content
    const element = document.createElement('div');
    element.style.cssText = `
      padding: 40px;
      background: white;
      font-family: 'Georgia', 'Times New Roman', serif;
      max-width: 600px;
      margin: 0 auto;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    `;
    
    // Format lyrics with proper line breaks
    const lyricsHtml = hymn.lyrics ? hymn.lyrics.split('\n').map(line => 
      `<p style="margin: 8px 0; text-align: center; font-size: 16px; line-height: 1.6;">${line || ' '}</p>`
    ).join('') : '<p style="text-align: center; color: #999;">Lyrics not available</p>';
    
    element.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #4f46e5; font-size: 28px; margin-bottom: 10px;">${hymn.title}</h1>
        ${hymn.reference ? `<p style="color: #64748b; font-size: 14px;">${hymn.reference}</p>` : ''}
        <div style="width: 60px; height: 3px; background: linear-gradient(90deg, #4f46e5, #7c3aed); margin: 20px auto;"></div>
      </div>
      <div style="margin-bottom: 30px;">
        ${lyricsHtml}
      </div>
      <div style="text-align: center; margin-top: 40px; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        ZUCA Hymn Book • Generated on ${new Date().toLocaleDateString()}
      </div>
    `;
    
    document.body.appendChild(element);
    
    // Use html2canvas to convert to image
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false
    });
    
    document.body.removeChild(element);
    
    // Download as PNG
    const link = document.createElement('a');
    link.download = `${hymn.title.replace(/[^a-z0-9]/gi, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    alert('✅ Image downloaded successfully!');
  } catch (error) {
    console.error('Image download failed:', error);
    alert('❌ Failed to download image. Please try again.');
  } finally {
    setDownloading(false);
  }
};

// Download hymn as PDF
const downloadHymnAsPDF = async (hymn) => {
  try {
    setDownloading(true);
    
    // Dynamically import jspdf
    const { jsPDF } = await import('jspdf');
    
    const pdf = new jsPDF({
      unit: 'pt',
      format: 'a4',
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);
    
    let y = margin + 20;
    
    // Title
    pdf.setFontSize(24);
    pdf.setTextColor(79, 70, 229);
    pdf.setFont('helvetica', 'bold');
    pdf.text(hymn.title, pageWidth / 2, y, { align: 'center' });
    y += 30;
    
    // Reference
    if (hymn.reference) {
      pdf.setFontSize(14);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.text(hymn.reference, pageWidth / 2, y, { align: 'center' });
      y += 40;
    } else {
      y += 20;
    }
    
    // Divider line
    pdf.setDrawColor(79, 70, 229);
    pdf.line(margin + 100, y - 10, pageWidth - margin - 100, y - 10);
    
    // Lyrics
    pdf.setFontSize(14);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'normal');
    
    if (hymn.lyrics) {
      const cleanLyrics = hymn.lyrics.replace(/\*\*([^*]+)\*\*/g, '$1');
      const lines = cleanLyrics.split('\n');
      
      for (const line of lines) {
        if (line.trim() === '') {
          y += 12;
        } else {
          if (y > pdf.internal.pageSize.getHeight() - margin) {
            pdf.addPage();
            y = margin + 20;
          }
          pdf.text(line, pageWidth / 2, y, { align: 'center' });
          y += 20;
        }
      }
    }
    
    // Footer
    y = pdf.internal.pageSize.getHeight() - margin;
    pdf.setFontSize(10);
    pdf.setTextColor(148, 163, 184);
    pdf.text('ZUCA Hymn Book', margin, y);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth - margin - 150, y);
    
    // Save PDF
    pdf.save(`${hymn.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    alert('✅ PDF downloaded successfully!');
  } catch (error) {
    console.error('PDF download failed:', error);
    alert('❌ Failed to download PDF. Please try again.');
  } finally {
    setDownloading(false);
  }
};

const openVideoModal = (video) => {
  setSelectedVideo(video);
  setShowVideoModal(true);
  document.body.style.overflow = 'hidden';
};

const closeVideoModal = () => {
  setShowVideoModal(false);
  setSelectedVideo(null);
  document.body.style.overflow = 'auto';
};



// Fetch featured media
useEffect(() => {
  const fetchFeaturedMedia = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/public/featured-media?limit=10`);
      // Handle both response formats (with or without wrapper)
      const mediaData = response.data.media || response.data;
      setFeaturedMedia(mediaData);
    } catch (err) {
      console.error('Error fetching featured media:', err);
      setFeaturedMedia([]);
    } finally {
      setLoadingMedia(false);
    }
  };
  
  fetchFeaturedMedia();
}, []);

// Format YouTube duration (PT1H2M10S -> 1:02:10)
const formatDuration = (duration) => {
  if (!duration) return '';
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Fetch upcoming events
useEffect(() => {
  const fetchUpcomingEvents = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/public/upcoming-events?limit=4`);
      console.log('Events response:', response.data);
      
      // Access the events array from the response
      if (response.data && response.data.events) {
        setUpcomingEvents(response.data.events);
      } else if (Array.isArray(response.data)) {
        setUpcomingEvents(response.data);
      } else {
        setUpcomingEvents([]);
      }
    } catch (err) {
      console.error('Error fetching upcoming events:', err);
      setUpcomingEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };
  
  fetchUpcomingEvents();
}, []);



// Fetch history content
useEffect(() => {
  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/history/public`);
      if (response.data.success) {
        setHistoryEntries(response.data.history);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };
  
  fetchHistory();
}, []);


// Fetch top watched YouTube videos
useEffect(() => {
  const fetchTopVideos = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/public/youtube-top?limit=3`);
      console.log('YouTube response:', response.data);
      
      if (response.data.success && response.data.videos && response.data.videos.length > 0) {
        setLatestVideo(response.data.videos); // Store all videos, not just first
      } else {
        setLatestVideo([]);
      }
    } catch (err) {
      console.error('YouTube API error:', err.message);
      setLatestVideo([]);
    } finally {
      setLoadingVideo(false);
    }
  };
  
  fetchTopVideos();
}, []);

// Load hymns on mount
useEffect(() => {
  fetchHymns(1, '');
}, []);

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
    const handleScroll = () => {
      setScrollY(window.scrollY);
      updateActiveSection();
    };
    
    window.addEventListener("scroll", handleScroll);


   
    
    // Fade-in on scroll observer
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in");
          }
        });
      },
      { threshold: 0.1 }
    );
    
    document.querySelectorAll(".fade-section").forEach(section => observer.observe(section));
    
    // Check if already installed
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isPWA) {
      setShowInstallButton(false);
    }
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

 const updateActiveSection = () => {
  const sections = [
    { id: 'home', ref: heroRef },
    { id: 'media', ref: mediaRef },
    { id: 'youtube', ref: youtubeRef },
    { id: 'events', ref: eventsRef },
    { id: 'hymns', ref: hymnsRef },
    { id: 'about', ref: aboutRef },
    { id: 'connect', ref: connectRef },
    { id: 'mass', ref: massRef },
    { id: 'contact', ref: contactRef }
  ];

    const scrollPosition = window.scrollY + 100;

    for (const section of sections) {
      if (section.ref.current) {
        const { offsetTop, offsetHeight } = section.ref.current;
        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          setActiveSection(section.id);
          break;
        }
      }
    }
  };

 const scrollToSection = (sectionId) => {
  const sectionRef = {
    home: heroRef,
    media: mediaRef,
    youtube: youtubeRef,
    events: eventsRef,
    hymns: hymnsRef,
    about: aboutRef,
    connect: connectRef,
    mass: massRef,
    contact: contactRef
  }[sectionId];

    if (sectionRef?.current) {
      const offset = 70;
      const elementPosition = sectionRef.current.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
    setMobileMenuOpen(false);
  };

  // Helper to format Kenyan date
const formatEventDate = (dateString) => {
  const date = new Date(dateString);
  return {
    day: date.getDate(),
    month: date.toLocaleString('default', { month: 'short' }),
    weekday: date.toLocaleString('default', { weekday: 'short' }),
    full: date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  };
};

  // PWA Install Prompt Handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Notification prompt
  useEffect(() => {
    const token = localStorage.getItem('token');
    const notificationsPrompted = localStorage.getItem('notificationsPrompted');
    
    if (token && !notificationsPrompted && 'Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallButton(false);
      }
    } else {
      alert(
        '📱 To install ZUCA Portal on your device:\n\n' +
        '🔵 Android (Chrome):\n' +
        '• Tap the menu button (⋮) at top right\n' +
        '• Select "Add to Home screen"\n' +
        '• Tap "Add" or "Install"\n\n' +
        '🍎 iPhone/iPad (Safari):\n' +
        '• Tap the Share button (📤) at bottom\n' +
        '• Scroll down and tap "Add to Home Screen"\n' +
        '• Tap "Add" in top right\n\n' +
        '💻 Desktop (Chrome/Edge):\n' +
        '• Click the install icon (➕) in address bar\n' +
        '• Click "Install"'
      );
    }
  };

  return (
    <div className="landing-wrapper">
      {/* Top Bar - Hidden on mobile */}
      <div className="top-bar">
        <div className="top-bar-content">
          <div className="top-bar-left">
            <FaHandsHelping className="top-bar-icon" />
            <span>Zetech Catholic Action • Faith & Fellowship</span>
          </div>
          <div className="top-bar-right">
            <span className="mass-badge">Weekly Mass: Wednesday 4:30 PM</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`navbar ${scrollY > 50 ? 'navbar-scrolled' : ''}`}>
        <div className="nav-container">
          <div className="logo-container" onClick={() => scrollToSection('home')} style={{ cursor: 'pointer' }}>
            <img src={logo} alt="ZUCA Logo" className="logo-img" />
            <span className="logo-text">ZUCA</span>
          </div>
          
         <div className="nav-links-desktop">
  <button onClick={() => scrollToSection('home')} className={`nav-link ${activeSection === 'home' ? 'active' : ''}`}>Home</button>
  <button onClick={() => scrollToSection('media')} className={`nav-link ${activeSection === 'media' ? 'active' : ''}`}>Media</button>
  <button onClick={() => scrollToSection('youtube')} className={`nav-link ${activeSection === 'youtube' ? 'active' : ''}`}>Videos</button>
  <button onClick={() => scrollToSection('events')} className={`nav-link ${activeSection === 'events' ? 'active' : ''}`}>Events</button>
  <button onClick={() => scrollToSection('hymns')} className={`nav-link ${activeSection === 'hymns' ? 'active' : ''}`}>Hymns</button>
  <button onClick={() => scrollToSection('about')} className={`nav-link ${activeSection === 'about' ? 'active' : ''}`}>About</button>
  <button onClick={() => scrollToSection('connect')} className={`nav-link ${activeSection === 'connect' ? 'active' : ''}`}>Connect</button>
  <button onClick={() => scrollToSection('mass')} className={`nav-link ${activeSection === 'mass' ? 'active' : ''}`}>Mass</button>
  <button onClick={() => scrollToSection('contact')} className={`nav-link ${activeSection === 'contact' ? 'active' : ''}`}>Contact</button>
</div>
          
          {/* Mobile Menu Button */}
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>
        
     <div className={`nav-links-mobile ${mobileMenuOpen ? 'open' : ''}`}>
  <button onClick={() => scrollToSection('home')} className="nav-link-mobile">Home</button>
  <button onClick={() => scrollToSection('media')} className="nav-link-mobile">Media</button>
  <button onClick={() => scrollToSection('youtube')} className="nav-link-mobile">Videos</button>
  <button onClick={() => scrollToSection('events')} className="nav-link-mobile">Events</button>
  <button onClick={() => scrollToSection('hymns')} className="nav-link-mobile">Hymns</button>
  <button onClick={() => scrollToSection('about')} className="nav-link-mobile">About</button>
  <button onClick={() => scrollToSection('connect')} className="nav-link-mobile">Connect</button>
  <button onClick={() => scrollToSection('mass')} className="nav-link-mobile">Mass</button>
  <button onClick={() => scrollToSection('contact')} className="nav-link-mobile">Contact</button>
</div>
      </nav>

      {/* Hero Section with Slideshow */}
      <section id="home" ref={heroRef} className="hero-section">
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
          
          {/* Slideshow Navigation Arrows */}
          <button className="slideshow-nav slideshow-nav-prev" onClick={prevSlide}>
            <FaChevronLeft />
          </button>
          <button className="slideshow-nav slideshow-nav-next" onClick={nextSlide}>
            <FaChevronRight />
          </button>
          
          {/* Slideshow Dots */}
          <div className="slideshow-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>
          
          {/* Play/Pause Button */}
          <button className="slideshow-play-pause" onClick={togglePlayPause}>
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
        </div>

        <div className="hero-container">
          {/* Action Buttons Row - Independently arranged */}
          <div className="action-buttons-row">
            {showInstallButton && (
              <button onClick={handleInstallClick} className="action-btn action-btn-install">
                <FaDownload /> Install Our App
              </button>
            )}
            <button onClick={() => navigate("/gallery")} className="action-btn action-btn-gallery">
              📷 Our Gallery
            </button>
            <button onClick={() => navigate("/liturgical-calendar")} className="action-btn action-btn-calendar">
              📅 Liturgical Calendar
            </button>
            <button onClick={() => navigate("/user-manual")} className="action-btn action-btn-register">
              <FaUserPlus /> 📚 Our User's Manual
            </button>
          </div>

          {/* Welcome Card */}
          <div className="welcome-card">
            <div className="welcome-header">
              <img src={logo} alt="ZUCA Logo" className="welcome-logo" />
              <h2 className="welcome-title">Zetech University</h2>
            </div>
            <div className="welcome-subtitle">CATHOLIC ACTION</div>
            <div className="zuca-name">(Z.U.C.A)</div>
         <p className="welcome-text">
  Welcome to the Zetech University Catholic Action official web dashbord.
  <br /><br />
  Zetech Catholic Action is a vibrant student community committed to evangelism, faith, and fellowship through the power of music and service. Our mission is to spread hope, love, and faith within our campus and beyond.
 
</p>
            <div className="welcome-buttons">
              <button onClick={() => navigate("/register")} className="btn-primary">
                <FaUserPlus /> CREATE  <strong> ZUCA </strong> ACCOUNT
              </button>
              <p>OR</p>
              <button onClick={() => navigate("/login")} className="btn-secondary">
                <FaSignInAlt /> MEMBER LOGIN
              </button>
            </div>
          </div>


               

          {/* Mass Info Card */}
          <div className="mass-info-card">
            <FaGooglePlay className="mass-info-icon" />
            <div className="mass-info-text">
              <strong>Remember to install our  PWA app using the orange button above  </strong>
              <span className="mass-location"></span>
            </div>
          </div>
        </div>
      </section>

       {/* Featured Media Section */}
     <section ref={mediaRef} id="media" className="section featured-media-section fade-section">
        <div className="container">
          <div className="section-header">
            <FaImage className="section-icon" />
            <h2 className="section-title">ZUCAS' top content</h2>
            <p className="section-subtitle">View  our latest shots from our gallery</p>
          </div>

          {loadingMedia ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading featured media...</p>
            </div>
          ) : featuredMedia.length === 0 ? (
            <div className="no-media">
              <p>No content available yet.</p>
            </div>
          ) : (
            <div className="media-grid">
              {featuredMedia.map((media) => (
               <div 
  key={media.id} 
  className="media-card"
  onClick={() => openMediaModal(media)}  // ← Add this
>
  {media.type === 'image' ? (
    <img 
      src={media.url} 
      alt={media.title || 'Featured media'} 
      className="media-image"
    />
  ) : (
    <video 
      src={media.url} 
      className="media-video"
      controls
      preload="metadata"
      onClick={(e) => e.stopPropagation()} // Prevent opening modal when clicking video controls
    />
  )}
  <div className="media-overlay">
    <h3 className="media-title">{media.title}</h3>
    <div className="media-stats">
      <span>❤️ {media._count?.likes || 0}</span>
      <span>👁️ {media._count?.views || 0}</span>
    </div>
  </div>
</div>
              ))}
            </div>
          )}
          
          <div className="view-all-container">
            <button 
              onClick={() => navigate("/gallery")} 
              className="view-all-btn"
            >
              View All Content →
            </button>
          </div>
        </div>
      </section>

      {/* Full Screen Media Modal */}
{isModalOpen && selectedMedia && (
  <div className="media-modal" onClick={closeMediaModal}>
    <div className="media-modal-content" onClick={(e) => e.stopPropagation()}>
      <button className="modal-close-btn" onClick={closeMediaModal}>
        &times;
      </button>
      {selectedMedia.type === 'image' ? (
        <img 
          src={selectedMedia.url} 
          alt={selectedMedia.title} 
          className="modal-image"
        />
      ) : (
        <video 
          src={selectedMedia.url} 
          className="modal-video"
          controls
          autoPlay
          preload="metadata"
        />
      )}
      <div className="modal-info">
        <h3 className="modal-title">{selectedMedia.title}</h3>
        {selectedMedia.description && (
          <p className="modal-description">{selectedMedia.description}</p>
        )}
        <div className="modal-stats">
          <span>❤️ {selectedMedia._count?.likes || 0}</span>
          <span>👁️ {selectedMedia._count?.views || 0}</span>
          <span>📅 {new Date(selectedMedia.createdAt).toLocaleDateString()}</span>
        </div>
        <button 
          className="modal-gallery-btn"
          onClick={() => {
            closeMediaModal();
            navigate("/gallery");
          }}
        >
          View Full Gallery →
        </button>
      </div>
    </div>
  </div>
)}


     {/* Top Watched YouTube Videos Section */}
<section ref={youtubeRef} id="youtube" className="section youtube-section fade-section">
  <div className="container">
    <div className="section-header">
      <FaYoutube className="section-icon youtube-icon" />
      <h2 className="section-title">Top Watched Videos</h2>
      <p className="section-subtitle">Top Youtube  content</p>
    </div>

    {loadingVideo ? (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading videos...</p>
      </div>
    ) : latestVideo.length > 0 ? (
      <div className="youtube-grid">
        {latestVideo.map((video, index) => (
         <div key={video.id} className="youtube-card" style={{ animationDelay: `${index * 0.1}s` }}>
  <div className="video-thumbnail-container" onClick={() => openVideoModal(video)}>
    <img 
      src={video.thumbnail} 
      alt={video.title} 
      className="youtube-thumbnail"
    />
    <div className="youtube-play-overlay">
      <div className="play-button">▶</div>
    </div>
    <div className="video-duration-badge">
      {formatDuration(video.duration)}
    </div>
  </div>
  <div className="youtube-info">
    <h3 className="youtube-title">{video.title}</h3>
    <div className="youtube-stats">
      <span>👁️ {video.views?.toLocaleString() || 0} views</span>
      <span>❤️ {video.likes?.toLocaleString() || 0} likes</span>
    </div>
    <button 
      onClick={() => openVideoModal(video)} 
      className="watch-now-btn"
    >
      🎬 Watch Now
    </button>
  </div>
</div>
        ))}
      </div>
    ) : (
      <div className="no-video">
        <p>No videos available yet. Check back soon!</p>
        <a 
          href="https://www.youtube.com/@zetechUniversityCatholic" 
          target="_blank" 
          rel="noopener noreferrer"
          className="subscribe-btn"
        >
          Subscribe to our Channel <FaYoutube />
        </a>
      </div>
    )}
  </div>
</section>


            {/* Upcoming Events Section */}
      <section ref={eventsRef} id="events" className="section events-section fade-section">
        <div className="container">
          <div className="section-header">
            <FaCalendarAlt className="section-icon" />
            <h2 className="section-title">Upcoming Events</h2>
            <p className="section-subtitle">Join us in our jumuias  and our activities in genereal</p>
          </div>

          {loadingEvents ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading upcoming events...</p>
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="events-grid">
              {upcomingEvents.map((event, index) => {
                const eventDate = formatEventDate(event.eventDate);
                return (
                  <div key={event.id} className="event-card" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="event-date">
                      <div className="event-day">{eventDate.day}</div>
                      <div className="event-month">{eventDate.month}</div>
                    </div>
                    <div className="event-details">
                      <h3 className="event-title">{event.title}</h3>
                      <div className="event-meta">
                        <div className="event-meta-item">
                          <FaClock className="meta-icon" />
                          <span>{event.eventTime || '4:30 PM'}</span>
                        </div>
                        <div className="event-meta-item">
                          <FaLocationArrow className="meta-icon" />
                          <span>{event.location || 'Annex Building 002'}</span>
                        </div>
                        <div className="event-meta-item">
                          <FaCalendarAlt className="meta-icon" />
                          <span>{eventDate.weekday}, {eventDate.full}</span>
                        </div>
                      </div>
                      {event.description && (
                        <p className="event-description">{event.description}</p>
                      )}
                      <div className="event-actions">
                        <button 
                          className="event-reminder-btn"
                          onClick={() => {
                            // Add to calendar functionality
                            const eventData = {
                              title: event.title,
                              start: event.eventDate,
                              end: event.eventDate,
                              location: event.location || 'Annex Building 002',
                              description: event.description || ''
                            };
                            // You can implement calendar download here
                            alert(`📅 Event: ${event.title}\n📆 Date: ${eventDate.full}\n⏰ Time: ${event.eventTime || '4:30 PM'}\n📍 Location: ${event.location || 'Annex Building 002'}\n\nAdd to your calendar!`);
                          }}
                        >
                          <FaClock /> Set Reminder
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-events">
              <FaCalendarAlt className="no-events-icon" />
              <p>No upcoming events at the moment.</p>
              <p className="no-events-sub">Check back soon for updates!</p>
            </div>
          )}
          
          <div className="view-all-events">
            <button 
              onClick={() => navigate("/schedules")} 
              className="view-all-events-btn"
            >
              View All Events →
            </button>
          </div>
        </div>
      </section>


            {/* Hymn Browser Section */}
      <section ref={hymnsRef} id="hymns" className="section hymns-section fade-section">
        <div className="container">
          <div className="section-header">
            <FaMusic className="section-icon" />
            <h2 className="section-title">Hymn Browser</h2>
            <p className="section-subtitle">Search Lyrics of diffrent songs all here at zuca</p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleHymnSearch} className="hymn-search-form">
            <div className="search-input-wrapper" style={{ position: 'relative' }}>
 <input
  type="text"
  placeholder="Search hymns by title or lyrics..."
  value={hymnSearch}
  onChange={handleSearchInput}
  onFocus={() => {
    if (hymnSearch.trim().length >= 2) {
      setShowSuggestions(true);
    }
  }}
  onBlur={() => {
    // Delay hiding so click on suggestion registers
    setTimeout(() => setShowSuggestions(false), 200);
  }}
  className="hymn-search-input"
/>
  <button type="submit" className="hymn-search-btn" onClick={handleHymnSearch}>
    🔍 Search
  </button>
  {isSearching && (
    <button type="button" onClick={clearSearch} className="hymn-clear-btn">
      ✕ Clear
    </button>
  )}
  
  {/* Suggestions Dropdown */}
  {showSuggestions && searchSuggestions.length > 0 && (
    <div className="search-suggestions">
      {searchSuggestions.map((suggestion, index) => (
       <div
  key={suggestion.id}
  className="suggestion-item"
  onClick={() => selectSuggestion(suggestion)}
  onMouseDown={(e) => e.preventDefault()}  // Add this to prevent input blur
  style={{ animationDelay: `${index * 0.03}s` }}
>
  <div className="suggestion-icon">🎵</div>
  <div className="suggestion-content">
    <div className="suggestion-title">{suggestion.title}</div>
    {suggestion.preview && (
      <div className="suggestion-preview">{suggestion.preview.substring(0, 60)}...</div>
    )}
  </div>
</div>
      ))}
    </div>
  )}
  
  {/* Loading indicator for live search */}
  {isSearchingLive && (
    <div className="search-loading">
      <div className="search-spinner"></div>
      <span>Searching...</span>
    </div>
  )}
</div>
          </form>

          {loadingHymns ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading hymns...</p>
            </div>
          ) : (
            <>
              <div className="hymns-grid">
                {(isSearching ? searchResults : hymns).map((hymn, index) => (
                  <div 
  key={hymn.id} 
  className={`hymn-card ${loadingHymnDetails ? 'loading' : ''}`}
  onClick={() => viewHymn(hymn.id)}
  style={{ animationDelay: `${index * 0.05}s` }}
>
  <div className="hymn-icon">
    {loadingHymnDetails ? (
      <div className="mini-spinner"></div>
    ) : (
      <FaMusic />
    )}
  </div>
  <div className="hymn-content">
    <h3 className="hymn-title">{hymn.title}</h3>
    {hymn.reference && (
      <span className="hymn-reference">{hymn.reference}</span>
    )}
    {hymn.preview && (
      <p className="hymn-preview">{hymn.preview}...</p>
    )}
    <div className="hymn-read-more">
      {loadingHymnDetails ? 'Loading...' : 'Read Lyrics →'}
    </div>
  </div>
</div>
                ))}
              </div>

              {!isSearching && hasMoreHymns && (
                <div className="load-more-container">
                  <button onClick={loadMoreHymns} className="load-more-btn">
                    Load More Hymns
                  </button>
                </div>
              )}

              

              {(isSearching ? searchResults : hymns).length === 0 && !loadingHymns && (
                <div className="no-hymns">
                  <FaMusic className="no-hymns-icon" />
                  <p>No hymns found</p>
                  {isSearching && (
                    <button onClick={clearSearch} className="clear-search-btn">
                      Browse All Hymns
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          <div className="view-all-hymns">
            <button 
              onClick={() => navigate("/hymns")} 
              className="view-all-hymns-btn"
            >
              View Full Hymn Book →
            </button>
          </div>
        </div>
      </section>

     {/* Hymn Detail Modal */}
{(showHymnModal || loadingHymnDetails) && (
  <div className="hymn-modal" onClick={closeHymnModal}>
    <div className="hymn-modal-content" onClick={(e) => e.stopPropagation()}>
      <button className="hymn-modal-close" onClick={closeHymnModal}>×</button>
      
      {loadingHymnDetails ? (
        // Loading State
        <div className="hymn-modal-loading">
          <div className="hymn-loading-spinner"></div>
          <p>Loading hymn lyrics...</p>
        </div>
      ) : (
        // Content State
        <>
          <div className="hymn-modal-header">
            <FaMusic className="hymn-modal-icon" />
            <h2>{selectedHymn?.title}</h2>
            {selectedHymn?.reference && (
              <span className="hymn-modal-reference">{selectedHymn.reference}</span>
            )}
          </div>
          
          <div className="hymn-modal-lyrics">
            {selectedHymn?.lyrics ? (
              selectedHymn.lyrics.split('\n').map((line, i) => (
                <p key={i}>{line || <br />}</p>
              ))
            ) : (
              <p className="no-lyrics">Lyrics not available yet.</p>
            )}
          </div>
          
          <div className="hymn-download-buttons">
            <button 
              className="hymn-download-btn image-btn"
              onClick={() => downloadHymnAsImage(selectedHymn)}
              disabled={downloading}
            >
              📸 Download as Image
            </button>
            <button 
              className="hymn-download-btn pdf-btn"
              onClick={() => downloadHymnAsPDF(selectedHymn)}
              disabled={downloading}
            >
              📄 Download as PDF
            </button>
          </div>
          
          <button 
            className="hymn-modal-view-all"
            onClick={() => {
              closeHymnModal();
              navigate("/hymns");
            }}
          >
            🎵 View All Hymns →
          </button>
        </>
      )}
    </div>
  </div>
)}

{/* YouTube Video Modal */}
{showVideoModal && selectedVideo && (
  <div className="video-modal" onClick={closeVideoModal}>
    <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
      <button className="video-modal-close" onClick={closeVideoModal}>×</button>
      
      <div className="video-container">
        <iframe
          src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0&modestbranding=1`}
          title={selectedVideo.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="video-iframe"
        ></iframe>
      </div>
      
      <div className="video-modal-info">
        <h3 className="video-modal-title">{selectedVideo.title}</h3>
        <div className="video-modal-stats">
          <span>👁️ {selectedVideo.views?.toLocaleString() || 0} views</span>
          <span>❤️ {selectedVideo.likes?.toLocaleString() || 0} likes</span>
          <span>💬 {selectedVideo.comments?.toLocaleString() || 0} comments</span>
        </div>
        {selectedVideo.description && (
          <p className="video-modal-description">{selectedVideo.description.substring(0, 200)}...</p>
        )}
        <div className="video-modal-buttons">
          <a 
            href={`https://www.youtube.com/watch?v=${selectedVideo.id}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="video-open-youtube"
          >
            Open on YouTube <FaYoutube />
          </a>
          <button onClick={closeVideoModal} className="video-close-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Mass Schedule Section */}
      <section id="mass" ref={massRef} className="section mass-section fade-section">
        <div className="container">
          <div className="section-header">
            <FaPray className="section-icon" />
            <h2 className="section-title">Weekly Mass & Choir Practice</h2>
            <p className="section-subtitle"></p>
          </div>

          <div className="mass-cards">
            <div className="mass-card">
              <FaChurch className="card-icon" />
              <h3 className="card-title">Wednesday Mass</h3>
              <div className="card-info">
                <FaClock className="info-icon" />
                <span>4:30 PM</span>
              </div>
              <div className="card-info">
                <FaLocationArrow className="info-icon" />
                <span>Annex Building 002</span>
              </div>
              <p className="card-note">come join us!</p>
            </div>

            <div className="mass-card">
              <FaPray className="card-icon" />
              <h3 className="card-title">Daily Choir Practice</h3>
              <div className="card-info">
                <FaClock className="info-icon" />
                <span>4:00 PM - 6:00 PM</span>
              </div>
              <div className="card-info">
                <FaLocationArrow className="info-icon" />
                <span>ZETECH ANNEX 002</span>
              </div>
              <p className="card-note">All are welcome to attend</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media Section */}
      <section id="connect" ref={connectRef} className="section social-section fade-section">
        <div className="container">
          <div className="section-header">
            <FaHeart className="section-icon" />
            <h2 className="section-title-light">Connect With Us</h2>
            <p className="section-subtitle-light">We apper in social media platforms as follows please follow, like, share and subscribe</p>
          </div>

          <div className="social-grid">
            <a href="https://www.instagram.com/zetechcatholicaction?igsh=d211Y2htZW9qbGU3" target="_blank" rel="noopener noreferrer" className="social-card">
              <div className="social-icon-circle instagram">
                <FaInstagram />
              </div>
              <span className="social-platform">Instagram</span>
              <span className="social-handle">@zetechcatholicaction</span>
            </a>

            <a href="https://www.facebook.com/share/1ELDK56qEJ" target="_blank" rel="noopener noreferrer" className="social-card">
              <div className="social-icon-circle facebook">
                <FaFacebookF />
              </div>
              <span className="social-platform">Facebook</span>
              <span className="social-handle">Zetech Catholic Action</span>
            </a>

            <a href="https://www.youtube.com/@zetechUniversityCatholic" target="_blank" rel="noopener noreferrer" className="social-card">
              <div className="social-icon-circle youtube">
                <FaYoutube />
              </div>
              <span className="social-platform">YouTube</span>
              <span className="social-handle">Subscribe for New Releases</span>
            </a>

            <a href="https://www.tiktok.com/@zetechcatholicaction?_t=ZM-8yeypKK8YpM&_r=1" target="_blank" rel="noopener noreferrer" className="social-card">
              <div className="social-icon-circle tiktok">
                <FaTiktok />
              </div>
              <span className="social-platform">TikTok</span>
              <span className="social-handle">@zetechcatholicaction</span>
            </a>
          </div>
        </div>
      </section>

     {/* About Section - Dynamic from Database */}
<section id="about" ref={aboutRef} className="section about-section fade-section">
  <div className="container">
    <div className="section-header">
      <img src={logo} alt="ZUCA Logo" className="about-logo" />
      <h2 className="section-title-dark">Our History</h2>
    </div>

    <div className="about-content">
      {loadingHistory ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading history...</p>
        </div>
      ) : historyEntries.length > 0 ? (
        <>
          {historyEntries.map((entry) => (
            <div key={entry.id} className="history-entry">
              <h3 className="history-title">{entry.title}</h3>
              <p className="about-text">{entry.content}</p>
            </div>
          ))}
        </>
      ) : (
        <p className="about-text">History content coming soon...</p>
      )}
      
      <div className="activities-grid">
        <div className="activity-item">
          <FaChurch className="activity-icon" />
          <span>OUR ACTIVITIES</span>
        </div>
        <div className="activity-item">
          <FaMusic className="activity-icon" />
          <span>Choir Practice/Mass Animations</span>
        </div>
        <div className="activity-item">
          <FaUsers className="activity-icon" />
          <span>Jumuia Groups</span>
        </div>
        <div className="activity-item">
          <FaHandsHelping className="activity-icon" />
          <span>Outdoor and Indoor functions</span>
        </div>
      </div>
    </div>
  </div>
</section>
      {/* Contact Section */}
      <section className="section contact-section fade-section" ref={contactRef}>
        <div className="container">
          <div className="section-header">
            <FaEnvelope className="section-icon-light" />
            <h2 className="section-title-light">Get In Touch</h2>
          </div>

          <div className="contact-grid">
            <div className="contact-item">
              <FaMapMarkerAlt className="contact-icon" />
              <span>Zetech University , Ruiru</span>
            </div>
            <div className="contact-item">
              <FaEnvelope className="contact-icon" />
                            <a href="mailto:zucaportal2025@gmail.com" className="contact-link">zuca406@gmail.com</a>
            </div><div className="contact-item">
              <FaPhone className="contact-icon" />
              <a href="tel:+254 798 139 693" className="contact-link">+254 798 139 693</a>(Tonny) Chair person
            </div>
             <div className="contact-item">
              <FaPhone className="contact-icon" />
              <a href="tel:+254 758 134 200" className="contact-link">+254 758 134 200</a>(Cecilia) Vice Chair person
            </div>
             <div className="contact-item">
              <FaPhone className="contact-icon" />
              <a href="tel:+254 746 893 181" className="contact-link">+254 746 893 181</a> <FaLaptop className="contact-icon" />(Chris) IT support

              <span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-social">
            <a href="https://www.instagram.com/zetechcatholicaction" target="_blank" rel="noopener noreferrer" className="footer-social-icon">
              <FaInstagram />
            </a>
            <a href="https://www.facebook.com/share/1ELDK56qEJ" target="_blank" rel="noopener noreferrer" className="footer-social-icon">
              <FaFacebookF />
            </a>
            <a href="https://www.youtube.com/@zetechUniversityCatholic" target="_blank" rel="noopener noreferrer" className="footer-social-icon">
              <FaYoutube />
            </a>
            <a href="https://www.tiktok.com/@zetechcatholicaction" target="_blank" rel="noopener noreferrer" className="footer-social-icon">
              <FaTiktok />
            </a>
          </div>

          {showInstallButton && (
            <div className="footer-install">
              <button onClick={handleInstallClick} className="btn-install-footer">
                <FaDownload /> Install ZUCA App
              </button>
            </div>
          )}

          <div className="footer-credit">
            <span></span>
            
            <span></span>
            <span className="credit-name"></span>
          </div>

          <div className="footer-copyright">
            <p>© {new Date().getFullYear()} Zetech Catholic Action Portal</p>
            <p>Built by @CHRISTECH WEBSYS</p>
          </div>
        </div>
      </footer>

      {/* Notification Prompt */}
      {showNotificationPrompt && (
        <NotificationPrompt onClose={() => {
          setShowNotificationPrompt(false);
          localStorage.setItem('notificationsPrompted', 'true');
        }} />
      )}

      <style jsx>{`
        /* Reset and Base Styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .landing-wrapper {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'TimesNewRoman', Roboto, sans-serif;
          color: #ffffff;
          overflow-x: hidden;
          min-height: 100vh;
          background: #0a0a1e;
        }

        /* Top Bar */
        .top-bar {
          background: rgba(30, 46, 192, 0.95);
          padding: 8px 20px;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1001;
          backdrop-filter: blur(10px);
        }

        .top-bar-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .top-bar-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .top-bar-icon {
          color: #ffd700;
          font-size: 12px;
        }

        .mass-badge {
          background: rgba(255, 255, 255, 0.1);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
        }

        /* Navigation */
        .navbar {
          position: fixed;
          top: 36px;
          left: 0;
          right: 0;
          z-index: 1000;
          transition: all 0.3s ease;
          background: transparent;
        }

        .navbar-scrolled {
          background: rgba(11, 11, 31, 0.95);
          backdrop-filter: blur(10px);
          top: 0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-img {
          width: 40px;
          height: auto;
        }

        .logo-text {
          font-size: 24px;
          font-weight: 800;
          background: linear-gradient(135deg, #fff, #00c6ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .nav-links-desktop {
          display: flex;
          gap: 30px;
        }

        .nav-link {
          background: none;
          border: none;
          color: white;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          padding: 8px 0;
          position: relative;
          transition: all 0.3s;
        }

        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #00c6ff, #007bff);
          transition: width 0.3s;
        }

        .nav-link:hover::after,
        .nav-link.active::after {
          width: 100%;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
        }

        .nav-links-mobile {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: rgba(11, 11, 31, 0.98);
          backdrop-filter: blur(10px);
          flex-direction: column;
          padding: 20px;
          gap: 15px;
          transform: translateY(-100%);
          transition: transform 0.3s ease;
        }

        .nav-links-mobile.open {
          transform: translateY(0);
          display: flex;
        }

        .nav-link-mobile {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          padding: 12px;
          text-align: center;
          cursor: pointer;
          border-radius: 10px;
          transition: background 0.3s;
        }

        .nav-link-mobile:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        /* Hero Section with Slideshow */
        .hero-section {
          min-height: 100vh;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 100px 20px 60px;
          overflow: hidden;
        }

        .slideshow-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
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

        .slide.active {
          opacity: 1;
          z-index: 2;
        }

        .slide-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(10, 10, 30, 0.23), rgba(10, 177, 29, 0.2));
          z-index: 1;
        }

        /* Slideshow Navigation Arrows */
        .slideshow-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.03);
          backdrop-filter: blur(1px);
          border: none;
          color: white;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
          transition: all 0.3s ease;
          font-size: 20px;
        }

        .slideshow-nav:hover {
          background: rgba(0, 198, 255, 0.8);
          transform: translateY(-50%) scale(1.05);
        }

        .slideshow-nav-prev {
          left: 20px;
        }

        .slideshow-nav-next {
          right: 20px;
        }

        /* Slideshow Dots */
        .slideshow-dots {
          position: absolute;
          bottom: 20px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 12px;
          z-index: 20;
          flex-wrap: wrap;
          padding: 0 16px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
        }

        .dot.active {
          background: #00c6ff;
          width: 24px;
          border-radius: 10px;
        }

        /* Play/Pause Button */
        .slideshow-play-pause {
          position: absolute;
          bottom: 20px;
          right: 20px;
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
          font-size: 14px;
        }

        .slideshow-play-pause:hover {
          background: rgba(0, 198, 255, 0.8);
          transform: scale(1.05);
        }

        .hero-container {
          position: relative;
          z-index: 10;
          max-width: 900px;
          width: 100%;
          text-align: center;
        }

        /* Action Buttons Row - Clean independent arrangement */
        .action-buttons-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 30px;
        }

        .action-btn {
          padding: 12px 24px;
          border-radius: 40px;
          border: none;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s ease;
          backdrop-filter: blur(8px);
          white-space: nowrap;
        }

        .action-btn:hover {
          transform: translateY(-3px);
          filter: brightness(1.05);
        }

        .action-btn-install {
          background: linear-gradient(135deg, #ffd700, #ffaa00);
          color: #1a1a2e;
          box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
        }

        .action-btn-gallery {
          background: linear-gradient(135deg, #0c992d, #0a7a24);
          color: white;
          box-shadow: 0 4px 15px rgba(12, 153, 45, 0.3);
        }

        .action-btn-calendar {
          background: linear-gradient(135deg, #1e3a8a, #0f172a);
          color: white;
          box-shadow: 0 4px 15px rgba(30, 58, 138, 0.3);
        }

        .action-btn-register {
          background: linear-gradient(135deg, #00c6ff, #007bff);
          color: white;
          box-shadow: 0 4px 15px rgba(0, 198, 255, 0.3);
        }

        /* Welcome Card */
        .welcome-card {
background: linear-gradient(
    135deg,
    rgba(5, 11, 34, 0.78),
    rgba(17, 34, 78, 0.55),
    rgba(18, 18, 19, 0.6)
);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: clamp(30px, 5vw, 40px) clamp(20px, 4vw, 30px);
          margin: 0 auto 25px;
          max-width: 600px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .welcome-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .welcome-logo {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 2px solid #00c6ff;
        }

        .welcome-title {
          font-size: clamp(20px, 5vw, 24px);
          font-weight: 800;
          color: white;
        }

        .welcome-subtitle {
          font-size: clamp(24px, 6vw, 32px);
          font-weight: 900;
          background: linear-gradient(135deg, #00c6ff, #007bff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 10px;
        }

        .zuca-name {
          font-size: clamp(16px, 4vw, 20px);
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 20px;
        }

        .welcome-text {
          font-size: clamp(14px, 3vw, 16px);
          color: #cbd5e1;
          line-height: 1.6;
          margin-bottom: 30px;
        }

        .welcome-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-primary,
        .btn-secondary {
          padding: 12px 28px;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #00c6ff, #007bff);
          border: none;
          color: white;
        }

        .btn-secondary {
          background: transparent;
          border: 2px solid #00c6ff;
          color: white;
        }

        .btn-primary:hover,
        .btn-secondary:hover {
          transform: translateY(-2px);
        }

        /* Mass Info Card */
        .mass-info-card {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(59, 171, 199, 0.4);
          backdrop-filter: blur(5px);
          padding: 12px 24px;
          border-radius: 50px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          margin: 0 auto;
        }

        .mass-info-icon {
          font-size: 20px;
          color: #fdffff;
        }

        .mass-info-text {
          font-size: 14px;
          text-align: left;
        }

        .mass-location {
          display: block;
          font-size: 12px;
          color: #94a3b8;
          margin-top: 2px;
        }

        /* General Section Styles */
        .section {
          padding: 60px 20px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 50px;
        }

        .section-icon {
          font-size: 48px;
          color: #00c6ff;
          margin-bottom: 20px;
        }

        .section-icon-light {
          font-size: 48px;
          color: #00c6ff;
          margin-bottom: 20px;
        }

        .section-title {
          font-size: clamp(28px, 5vw, 36px);
          font-weight: 800;
          margin-bottom: 15px;
          color: white;
        }

        .section-title-light {
          font-size: clamp(28px, 5vw, 36px);
          font-weight: 800;
          margin-bottom: 15px;
          color: white;
        }

        .section-title-dark {
          font-size: clamp(28px, 5vw, 36px);
          font-weight: 800;
          margin-bottom: 15px;
          color: #0a0a25;
        }

        .section-subtitle,
        .section-subtitle-light {
          font-size: 16px;
          color: #ffffff;
        }

        /* Mass Section */
        .mass-section {
          background: linear-gradient(135deg, #1e3a8a, #0f172a);
        }

        .mass-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 30px;
          max-width: 700px;
          margin: 0 auto;
        }

        .mass-card {
          background: rgba(255, 255, 255, 0.08);
          padding: 35px 25px;
          border-radius: 20px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: transform 0.3s;
        }

        .mass-card:hover {
          transform: translateY(-5px);
        }

        .card-icon {
          font-size: 48px;
          color: #00c6ff;
          margin-bottom: 20px;
        }

        .card-title {
          font-size: 22px;
          font-weight: 600;
          margin-bottom: 20px;
          color: white;
        }

        .card-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 12px;
          color: #cbd5e1;
          font-size: 14px;
        }

        .info-icon {
          font-size: 14px;
          color: #00c6ff;
        }

        .card-note {
          font-size: 13px;
          color: #94a3b8;
          font-style: italic;
          margin-top: 15px;
        }

        /* Social Section */
        .social-section {
          background: #0a0a25;
        }

        .social-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 25px;
          max-width: 900px;
          margin: 0 auto;
        }

        .social-card {
          padding: 30px 20px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s;
          cursor: pointer;
        }

        .social-card:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.1);
        }

        .social-icon-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin-bottom: 5px;
        }

        .social-icon-circle.instagram {
          background: radial-gradient(circle at 30% 30%, #f09433, #d62976, #962fbf);
          color: white;
        }

        .social-icon-circle.facebook {
          background: #0214dc;
          color: #ffffff;
        }

        .social-icon-circle.youtube {
          background: #FF0000;
          color: white;
        }

        .social-icon-circle.tiktok {
          background: #000000;
          color: white;
        }

        .social-platform {
          font-size: 16px;
          font-weight: 600;
          color: white;
        }

        .social-handle {
          font-size: 11px;
          color: #94a3b8;
        }

        /* About Section */
        .about-section {
          background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
        }

        .about-logo {
          width: 70px;
          height: auto;
          margin-bottom: 20px;
        }

        .about-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .about-text {
          font-size: 18px;
          line-height: 1.7;
          color: #1e293b;
          text-align: center;
          margin-bottom: 40px;
        }

        .activities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 15px;
          max-width: 500px;
          margin: 0 auto;
        }

        .activity-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 20px;
          background: white;
          border-radius: 12px;
          font-size: 14px;
          color: #1e293b;
          font-weight: 500;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .activity-icon {
          font-size: 18px;
          color: #00c6ff;
        }

        /* Contact Section */
        .contact-section {
          background: linear-gradient(135deg, #0f172a, #1e293b);
        }

        .contact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .contact-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 15px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          font-size: 14px;
          color: white;
        }

        .contact-icon {
          font-size: 18px;
          color: #00c6ff;
        }

        .contact-link {
          color: white;
          text-decoration: none;
          transition: color 0.3s;
        }

        .contact-link:hover {
          color: #00c6ff;
        }

        /* Footer */
        .footer {
          background: #0f0f1a;
          padding: 40px 20px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }

        .footer-social {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-bottom: 25px;
        }

        .footer-social-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          transition: all 0.3s;
        }

        .footer-social-icon:hover {
          background: #00c6ff;
          transform: translateY(-3px);
        }

        .footer-install {
          margin-bottom: 25px;
        }

        .btn-install-footer {
          padding: 12px 28px;
          border-radius: 30px;
          border: none;
          background: linear-gradient(135deg, #ffd700, #ffaa00);
          color: #000;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .footer-credit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 15px;
          font-size: 14px;
          color: #94a3b8;
        }

        .credit-heart {
          color: #ff6b6b;
        }

        .credit-name {
          color: #00c6ff;
          font-weight: 600;
        }

        .footer-copyright {
          font-size: 12px;
          color: #64748b;
        }

        /* Animations */
        .fade-section {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease;
        }

        .fade-section.fade-in {
          opacity: 1;
          transform: translateY(0);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .top-bar {
            display: none;
          }

          .navbar {
            top: 0;
          }

          .nav-links-desktop {
            display: none;
          }

          .mobile-menu-btn {
            display: block;
          }

          .action-buttons-row {
            gap: 12px;
          }

          .action-btn {
            padding: 8px 16px;
            font-size: 12px;
          }

          .mass-cards {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .social-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }

          .activities-grid {
            grid-template-columns: 1fr;
          }

          .contact-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .section {
            padding: 40px 16px;
          }

          .welcome-buttons {
            flex-direction: column;
            gap: 12px;
          }

          .btn-primary,
          .btn-secondary {
            width: 100%;
            justify-content: center;
          }

          .slideshow-nav {
            width: 36px;
            height: 36px;
            font-size: 16px;
          }

          .slideshow-nav-prev {
            left: 10px;
          }

          .slideshow-nav-next {
            right: 10px;
          }

          .slideshow-play-pause {
            width: 36px;
            height: 36px;
            font-size: 12px;
            bottom: 15px;
            right: 15px;
          }
        }

        @media (max-width: 480px) {
          .social-grid {
            grid-template-columns: 1fr;
          }

          .action-buttons-row {
            flex-direction: column;
            width: 100%;
          }

          .action-btn {
            width: 100%;
            justify-content: center;
          }

          .mass-info-card {
            flex-direction: column;
            text-align: center;
            padding: 15px;
          }

          .mass-info-text {
            text-align: center;
          }

          .slideshow-nav {
            width: 30px;
            height: 30px;
            font-size: 14px;
          }

          .dot {
            width: 8px;
            height: 8px;
          }

          .dot.active {
            width: 20px;
          }
        }

                /* Featured Media Section */
        .featured-media-section {
          background: linear-gradient(135deg, #b5d114cc, #ffffff);
        }

        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 25px;
          margin-top: 40px;
        }

        .media-card {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.05);
          aspect-ratio: 16/9;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .media-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 198, 255, 0.2);
        }

        .media-image,
        .media-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .media-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          padding: 20px 15px 10px;
          transform: translateY(100%);
          transition: transform 0.3s ease;
        }

        .media-card:hover .media-overlay {
          transform: translateY(0);
        }

        .media-title {
          font-size: 14px;
          font-weight: 600;
          color: white;
          margin-bottom: 5px;
        }

        .media-stats {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #cbd5e1;
        }

        .loading-spinner {
          text-align: center;
          padding: 60px 20px;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #00c6ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .no-media {
          text-align: center;
          padding: 60px 20px;
          color: #94a3b8;
        }

        .view-all-container {
          text-align: center;
          margin-top: 50px;
        }

        .view-all-btn {
          background: linear-gradient(135deg, #00c6ff, #007bff);
          border: none;
          padding: 12px 32px;
          border-radius: 30px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .view-all-btn:hover {
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .media-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 15px;
          }
        }

        /* Full Screen Modal */
.media-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  animation: fadeIn 0.3s ease;
}

.media-modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  background: #1e293b;
  border-radius: 20px;
  overflow: hidden;
  animation: scaleIn 0.3s ease;
}

.modal-close-btn {
  position: absolute;
  top: 15px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  color: white;
  font-size: 32px;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.modal-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  display: block;
}

.modal-video {
  max-width: 100%;
  max-height: 70vh;
  width: 100%;
}

.modal-info {
  padding: 20px;
  background: #1e293b;
  color: white;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #00c6ff;
}

.modal-description {
  font-size: 14px;
  color: #cbd5e1;
  margin-bottom: 12px;
  line-height: 1.5;
}

.modal-stats {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.modal-gallery-btn {
  background: linear-gradient(135deg, #00c6ff, #007bff);
  border: none;
  padding: 12px 24px;
  border-radius: 30px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.3s ease;
  width: 100%;
}

.modal-gallery-btn:hover {
  transform: translateY(-2px);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { 
    transform: scale(0.9);
    opacity: 0;
  }
  to { 
    transform: scale(1);
    opacity: 1;
  }
}

/* Mobile modal adjustments */
@media (max-width: 768px) {
  .media-modal-content {
    max-width: 95vw;
    max-height: 95vh;
    border-radius: 16px;
  }
  
  .modal-image,
  .modal-video {
    max-height: 60vh;
  }
  
  .modal-info {
    padding: 16px;
  }
  
  .modal-title {
    font-size: 18px;
  }
  
  .modal-close-btn {
    top: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    font-size: 28px;
  }
}

        /* YouTube Section */
        .youtube-section {
          background: linear-gradient(135deg, #0f172a, #1e1b4b);
        }

        .youtube-icon {
          color: #FF0000;
        }

        .youtube-card {
          max-width: 800px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .youtube-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .youtube-link {
          display: block;
          position: relative;
          cursor: pointer;
        }

        .youtube-thumbnail-container {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          overflow: hidden;
        }

        .youtube-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .youtube-card:hover .youtube-thumbnail {
          transform: scale(1.05);
        }

        .youtube-play-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.3s ease;
        }

        .youtube-card:hover .youtube-play-overlay {
          background: rgba(0, 0, 0, 0.6);
        }

        .play-button {
          width: 80px;
          height: 80px;
          background: rgba(255, 0, 0, 0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          color: white;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .youtube-card:hover .play-button {
          transform: scale(1.1);
          background: #FF0000;
          box-shadow: 0 8px 30px rgba(255, 0, 0, 0.4);
        }

        .youtube-info {
          padding: 24px;
        }

        .youtube-title {
          font-size: 20px;
          font-weight: 600;
          color: white;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .youtube-stats {
          display: flex;
          gap: 20px;
          margin-bottom: 16px;
          font-size: 14px;
          color: #94a3b8;
          flex-wrap: wrap;
        }

        .youtube-description {
          font-size: 14px;
          color: #cbd5e1;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .watch-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 24px;
          background: linear-gradient(135deg, #FF0000, #cc0000);
          border: none;
          border-radius: 30px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .watch-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(255, 0, 0, 0.4);
        }

        .subscribe-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          background: linear-gradient(135deg, #FF0000, #cc0000);
          border-radius: 30px;
          color: white;
          text-decoration: none;
          font-weight: 600;
          margin-top: 20px;
          transition: all 0.3s ease;
        }

        .subscribe-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(255, 0, 0, 0.4);
        }

        .no-video {
          text-align: center;
          padding: 60px 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
        }

        .no-video p {
          color: #94a3b8;
          margin-bottom: 20px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .play-button {
            width: 60px;
            height: 60px;
            font-size: 28px;
          }

          .youtube-info {
            padding: 20px;
          }

          .youtube-title {
            font-size: 18px;
          }

          .youtube-stats {
            gap: 12px;
            font-size: 12px;
          }

          .watch-btn {
            padding: 10px 20px;
            font-size: 13px;
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .play-button {
            width: 50px;
            height: 50px;
            font-size: 24px;
          }

          .youtube-info {
            padding: 16px;
          }
        }

                /* Upcoming Events Section */
        .events-section {
          background: linear-gradient(135deg, #0f172a, #1e293b);
        }

        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 25px;
          margin-top: 40px;
        }

        .event-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          transition: all 0.3s ease;
          animation: fadeInUp 0.6s ease backwards;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .event-card:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(0, 198, 255, 0.3);
          box-shadow: 0 10px 30px rgba(0, 198, 255, 0.1);
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .event-date {
          background: linear-gradient(135deg, #00c6ff, #007bff);
          padding: 20px 15px;
          text-align: center;
          min-width: 80px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .event-day {
          font-size: 32px;
          font-weight: 800;
          color: white;
          line-height: 1;
        }

        .event-month {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
          margin-top: 5px;
        }

        .event-details {
          flex: 1;
          padding: 20px;
        }

        .event-title {
          font-size: 18px;
          font-weight: 700;
          color: white;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .event-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .event-meta-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #cbd5e1;
        }

        .meta-icon {
          font-size: 12px;
          color: #00c6ff;
        }

        .event-description {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 15px;
        }

        .event-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .event-reminder-btn {
          background: rgba(0, 198, 255, 0.1);
          border: 1px solid rgba(0, 198, 255, 0.3);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: #00c6ff;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .event-reminder-btn:hover {
          background: rgba(0, 198, 255, 0.2);
          transform: translateY(-2px);
        }

        .view-all-events {
          text-align: center;
          margin-top: 50px;
        }

        .view-all-events-btn {
          background: linear-gradient(135deg, #00c6ff, #007bff);
          border: none;
          padding: 12px 32px;
          border-radius: 30px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .view-all-events-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 198, 255, 0.3);
        }

        .no-events {
          text-align: center;
          padding: 60px 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
        }

        .no-events-icon {
          font-size: 48px;
          color: #64748b;
          margin-bottom: 20px;
        }

        .no-events p {
          color: #94a3b8;
          font-size: 16px;
        }

        .no-events-sub {
          font-size: 14px;
          margin-top: 8px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .events-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .event-card {
            flex-direction: column;
          }

          .event-date {
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 12px;
          }

          .event-day {
            font-size: 24px;
          }

          .event-month {
            font-size: 12px;
            margin-top: 0;
          }

          .event-details {
            padding: 16px;
          }

          .event-title {
            font-size: 16px;
          }

          .event-meta-item {
            font-size: 12px;
          }

          .view-all-events-btn {
            padding: 10px 24px;
            font-size: 14px;
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .event-date {
            padding: 10px;
          }

          .event-day {
            font-size: 20px;
          }

          .event-details {
            padding: 14px;
          }

          .event-reminder-btn {
            width: 100%;
            justify-content: center;
          }
        }
                  /* Hymn Browser Section */
        .hymns-section {
          background: linear-gradient(135deg, #0f172a, #1e293b);
        }

        .hymn-search-form {
          max-width: 600px;
          margin: 0 auto 40px;
        }

        .search-input-wrapper {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .hymn-search-input {
          flex: 1;
          padding: 14px 20px;
          border-radius: 50px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 14px;
          outline: none;
          transition: all 0.3s ease;
        }

        .hymn-search-input:focus {
          border-color: #00c6ff;
          background: rgba(255, 255, 255, 0.15);
        }

        .hymn-search-input::placeholder {
          color: #94a3b8;
        }

        .hymn-search-btn {
          padding: 12px 28px;
          border-radius: 50px;
          background: linear-gradient(135deg, #00c6ff, #007bff);
          border: none;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .hymn-search-btn:hover {
          transform: translateY(-2px);
        }

        .hymn-clear-btn {
          padding: 12px 24px;
          border-radius: 50px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .hymn-clear-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .hymns-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .hymn-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          gap: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          animation: fadeInUp 0.5s ease backwards;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .hymn-card:hover {
          transform: translateY(-3px);
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(0, 198, 255, 0.3);
        }

        .hymn-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background: linear-gradient(135deg, #00c6ff, #007bff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
          flex-shrink: 0;
        }

        .hymn-content {
          flex: 1;
        }

        .hymn-title {
          font-size: 16px;
          font-weight: 700;
          color: white;
          margin-bottom: 5px;
        }

        .hymn-reference {
          font-size: 11px;
          color: #00c6ff;
          display: inline-block;
          margin-bottom: 8px;
        }

        .hymn-preview {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 10px;
        }

        .hymn-read-more {
          font-size: 12px;
          color: #00c6ff;
          font-weight: 500;
        }

        .load-more-container {
          text-align: center;
          margin-top: 40px;
        }

        .load-more-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 12px 32px;
          border-radius: 30px;
          color: white;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .load-more-btn:hover {
          background: rgba(0, 198, 255, 0.2);
          border-color: #00c6ff;
        }

        .no-hymns {
          text-align: center;
          padding: 60px 20px;
        }

        .no-hymns-icon {
          font-size: 48px;
          color: #64748b;
          margin-bottom: 20px;
        }

        .no-hymns p {
          color: #94a3b8;
          margin-bottom: 20px;
        }

        .clear-search-btn {
          background: linear-gradient(135deg, #00c6ff, #007bff);
          border: none;
          padding: 10px 24px;
          border-radius: 30px;
          color: white;
          cursor: pointer;
        }

        .view-all-hymns {
          text-align: center;
          margin-top: 50px;
        }

        .view-all-hymns-btn {
          background: linear-gradient(135deg, #00c6ff, #007bff);
          border: none;
          padding: 12px 32px;
          border-radius: 30px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .view-all-hymns-btn:hover {
          transform: translateY(-2px);
        }

      /* Hymn Modal */
.hymn-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.hymn-modal-content {
  max-width: 700px;
  width: 90%;
  max-height: 85vh;
  background: #000000;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: scaleIn 0.3s ease;
}

.hymn-modal-header {
  text-align: center;
  padding: 30px 20px 20px;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  flex-shrink: 0;
}

.hymn-modal-lyrics {
  padding: 30px;
  overflow-y: auto;
  color: #cbd5e1;
  line-height: 1.8;
  white-space: pre-wrap;
  flex: 1;
}

/* Download Buttons */
.hymn-download-buttons {
  display: flex;
  gap: 12px;
  padding: 0 20px 15px 20px;
  flex-shrink: 0;
}

.hymn-download-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: none;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.hymn-download-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hymn-download-btn.image-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.hymn-download-btn.image-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
}

.hymn-download-btn.pdf-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.hymn-download-btn.pdf-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
}

.hymn-modal-view-all {
  display: block;
  margin: 0 20px 20px;
  padding: 14px;
  background: linear-gradient(135deg, #00c6ff, #007bff);
  border: none;
  border-radius: 30px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.hymn-modal-view-all:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 198, 255, 0.4);
}

@media (max-width: 768px) {
  .hymn-modal-content {
    width: 95%;
    max-height: 90vh;
  }
  
  .hymn-modal-lyrics {
    padding: 20px;
    font-size: 14px;
  }
  
  .hymn-download-buttons {
    flex-direction: column;
    gap: 10px;
    padding: 0 16px 12px 16px;
  }
  
  .hymn-download-btn {
    padding: 10px;
    font-size: 13px;
  }
  
  .hymn-modal-view-all {
    margin: 0 16px 16px;
    padding: 12px;
  }
}
          /* Search Suggestions */
.search-input-wrapper {
  position: relative;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1e293b;
  border-radius: 16px;
  margin-top: 8px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  animation: fadeInUp 0.3s ease backwards;
}

.suggestion-item:hover {
  background: rgba(0, 198, 255, 0.1);
}

.suggestion-icon {
  font-size: 20px;
  min-width: 32px;
}

.suggestion-content {
  flex: 1;
}

.suggestion-title {
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.suggestion-preview {
  font-size: 12px;
  color: #94a3b8;
}

.search-loading {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1e293b;
  border-radius: 12px;
  margin-top: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #00c6ff;
  font-size: 14px;
}

.search-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 198, 255, 0.2);
  border-top-color: #00c6ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Scrollbar styling */
.search-suggestions::-webkit-scrollbar {
  width: 6px;
}

.search-suggestions::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.search-suggestions::-webkit-scrollbar-thumb {
  background: #00c6ff;
  border-radius: 3px;
}

/* YouTube Grid Layout */
.youtube-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 25px;
  margin-top: 20px;
}

.youtube-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  animation: fadeInUp 0.5s ease backwards;
}

.youtube-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

/* Adjust play button size for cards */
.youtube-card .play-button {
  width: 50px;
  height: 50px;
  font-size: 24px;
}

.youtube-card .youtube-title {
  font-size: 16px;
  margin-bottom: 8px;
}

.youtube-card .youtube-stats {
  gap: 12px;
  font-size: 12px;
  margin-bottom: 12px;
}

.youtube-card .watch-btn {
  padding: 8px 16px;
  font-size: 13px;
  width: 100%;
  justify-content: center;
}

.youtube-card .youtube-info {
  padding: 16px;
}

@media (max-width: 768px) {
  .youtube-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

/* Hymn Download Buttons */
.hymn-download-buttons {
  display: flex;
  gap: 12px;
  margin: 0 20px 15px;
}

.hymn-download-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: none;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.hymn-download-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hymn-download-btn.image-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.hymn-download-btn.image-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
}

.hymn-download-btn.pdf-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.hymn-download-btn.pdf-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
}

@media (max-width: 768px) {
  .hymn-download-buttons {
    flex-direction: column;
    margin: 0 16px 12px;
  }
  
  .hymn-download-btn {
    padding: 10px;
    font-size: 13px;
  }
}

/* Hymn Modal Loading State */
.hymn-modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 60px 40px;
  text-align: center;
}

.hymn-loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(0, 198, 255, 0.1);
  border-top-color: #00c6ff;
  border-radius: 50%;
  animation: hymnSpin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes hymnSpin {
  to { transform: rotate(360deg); }
}

.hymn-modal-loading p {
  color: #94a3b8;
  font-size: 16px;
}

/* Also add a loading state for the hymn cards when clicked */
.hymn-card.loading {
  opacity: 0.6;
  pointer-events: none;
}

  .mini-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: white;
  border-radius: 50%;
  animation: hymnSpin 0.8s linear infinite;
}

/* YouTube Video Modal */
.video-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 10002;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  animation: fadeIn 0.3s ease;
}

.video-modal-content {
  max-width: 900px;
  width: 90%;
  max-height: 90vh;
  background: #1e293b;
  border-radius: 20px;
  overflow: hidden;
  animation: scaleIn 0.3s ease;
}

.video-modal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  color: white;
  font-size: 28px;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s ease;
}

.video-modal-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.video-container {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  background: #000;
}

.video-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

.video-modal-info {
  padding: 24px;
  color: white;
}

.video-modal-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #00c6ff;
}

.video-modal-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #94a3b8;
  flex-wrap: wrap;
}

.video-modal-description {
  font-size: 14px;
  color: #cbd5e1;
  line-height: 1.6;
  margin-bottom: 20px;
}

.video-modal-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.video-open-youtube {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #FF0000, #cc0000);
  border: none;
  border-radius: 30px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.video-open-youtube:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 0, 0, 0.4);
}

.video-close-btn {
  flex: 1;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 30px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.video-close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.video-duration-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: white;
  z-index: 5;
}

.video-thumbnail-container {
  position: relative;
  cursor: pointer;
}

.watch-now-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #00c6ff, #007bff);
  border: none;
  border-radius: 30px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 12px;
}

.watch-now-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 198, 255, 0.4);
}

@media (max-width: 768px) {
  .video-modal-content {
    width: 95%;
    max-height: 95vh;
  }
  
  .video-modal-info {
    padding: 16px;
  }
  
  .video-modal-title {
    font-size: 18px;
  }
  
  .video-modal-stats {
    gap: 12px;
    font-size: 12px;
  }
  
  .video-modal-buttons {
    flex-direction: column;
  }
  
  .video-modal-close {
    top: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    font-size: 24px;
  }
}

/* History Section */
.history-entry {
  margin-bottom: 35px;
}

.history-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e3a8a;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 3px solid #00c6ff;
  display: inline-block;
}

.about-text {
  font-size: 16px;
  line-height: 1.7;
  color: #1e293b;
  text-align: left;
  margin-top: 10px;
}

@media (max-width: 768px) {
  .history-title {
    font-size: 18px;
  }
  .about-text {
    font-size: 14px;
  }
}
      `}</style>
    </div>
  );
}

export default Landing2;
