// frontend/src/pages/Landing2.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaArrowRight,
  FaBars,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaChurch,
  FaClock,
  FaDownload,
  FaEnvelope,
  FaFacebookF,
  FaFilePdf,
  FaHandsHelping,
  FaHeart,
  FaImage,
  FaInstagram,
  FaLaptop,
  FaLocationArrow,
  FaMapMarkerAlt,
  FaMusic,
  FaPause,
  FaPhone,
  FaPlay,
  FaPray,
  FaSearch,
  FaSignInAlt,
  FaTimes,
  FaTiktok,
  FaUserPlus,
  FaUsers,
  FaImages,
  FaBookOpen,
  FaCalendarCheck,
  FaYoutube,
  FaFileWord,
  FaPrayingHands,
} from "react-icons/fa";

import BASE_URL from "../api";
import logo from "../assets/zuca-logo.png";
import fau from "../assets/fau.png"
import dayson from "../assets/dayson.jpg"
import NotificationPrompt from "../components/NotificationPrompt";

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
import { Navigate } from "react-router-dom";

import "./landing2.css";

// ------------------------------------------------------------
// Hero slide copy — one line of editorial copy per photo
// ------------------------------------------------------------
const slides = [
  { image: slide2, eyebrow: "UNITY • IN • PORPOSE", title: "Growing together in faith and uniting in purpose.", text: "Zetech Catholic Action is a vibrant student group committed to evangelism, faith, and fellowship through music and action. " },
  { image: slide3, eyebrow: "CLUB", title: "Who are we?.", text: " Our mission is to spread the message of hope, love, and faith within our campus community and beyond." },
  { image: slide4, eyebrow: "SINGING", title: "We Come together to show case our voices.", text: "Our songs will be an  expression of our devotion and a call to all to embrace God’s grace." },
  { image: slide5, eyebrow: "ZETECH UNIVERSITY CATHOLIC ACTION", title: "A place to belong wewe uko? .", text: "Join us as we make this journey of music inspirering uplifting." },
  { image: slide6, eyebrow: "LET'S MEET!", title: "Make your university journey meaningful by joining us.", text: "Don't forget to like, share, and subscribe for more inspiring content from Zetech Catholic Action!" },
  { image: slide7, eyebrow: "LETS SERVE", title: "Faith expressed through action We take part in community work and charity works.", text: "#ZetechCatholicAction #Evangelism #FaithThroughMusic #ChristianStudents #NewRelease#harmonyinvoices" },
  { image: slide8, eyebrow: "LEARN ABOUT US!", title: "Understand our purpose.", text: "Here you Access resources, prayers, hymns and relevant content for your spiritual growth as a catholic." },
  { image: slide9, eyebrow: "ZUCA", title: "Catholic Students online.", text: "One place for the information, resources and connections that keep ZUCA moving." },
  { image: slide10, eyebrow: "HARMONY IN VOICES• UNITY IN PORPOSE", title: "Discover. Connect. Serve.", text: "Take an active part in a vibrant Catholic student club here we accept everyone." },
  { image: slide11, eyebrow: "STUDENTS LIFE", title: "There is a place for you here.", text: "Meet, pray, sing and serve with the ZUCA family we are all one." },
  { image: slide12, eyebrow: "WELCOME TO ZUCA", title: "Your journey starts here.", text: "Create your account and become part of the Zetech University Catholic Action club." },
];

const navItems = [
  ["home", "Home"],
  ["media", "Media"],
  ["youtube", "Videos"],
  ["events", "Events"],
  ["hymns", "Hymns"],
  ["about", "About"],
  ["connect", "Connect"],
  ["mass", "Mass"],
  ["contact", "Contact"],
];

function Landing2() {
  const navigate = useNavigate();

  // ---------------- Hero / slideshow ----------------
  const [currentSlide, setCurrentSlide] = useState(0);
  const [playing, setPlaying] = useState(true);
  const touchStart = useRef(null);

  // ---------------- Nav / chrome ----------------
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  // ---------------- Featured media ----------------
  const [media, setMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // ---------------- YouTube videos ----------------
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // ---------------- Events ----------------
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // ---------------- History / About ----------------
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // ---------------- Hymns ----------------
  const [hymns, setHymns] = useState([]);
  const [loadingHymns, setLoadingHymns] = useState(true);
  const [hymnsPage, setHymnsPage] = useState(1);
  const [hasMoreHymns, setHasMoreHymns] = useState(false);

  const [hymnSearch, setHymnSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  const [selectedHymn, setSelectedHymn] = useState(null);
  const [showHymnModal, setShowHymnModal] = useState(false);
  const [loadingHymnDetails, setLoadingHymnDetails] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // ---------------- PWA install ----------------
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(true);


  // ---------------- Executive Positions ----------------
const [executivePositions, setExecutivePositions] = useState([]);
const [loadingExecutives, setLoadingExecutives] = useState(true);

// Helper function to get icon based on position title
const getPositionIcon = (title) => {
  const iconMap = {
    'Chairperson': <FaPhone />,
    'Vice Chairperson': <FaPhone />,
    'Secretary': <FaEnvelope />,
    'Vice Secretary': <FaEnvelope />,
    'Treasurer': <FaPhone />,
    'Organising Secretary': <FaCalendarAlt />,
    'Welfare': <FaHandsHelping />,
    'Liturgist': <FaChurch />,
    'Choir Moderator': <FaMusic />,
    'Vice Choir Moderator': <FaMusic />,
    'Media Moderator': <FaLaptop />,
    'instrumentals': <FaMusic />,
    'St. Michael Moderator': <FaUsers />,
    'St. Benedict Moderator': <FaUsers />,
    'St. Peregrine Moderator': <FaUsers />,
    'Christ the King Moderator': <FaUsers />,
    'St. Gregory Moderator': <FaUsers />,
    'St. Pacificus Moderator': <FaUsers />,
    'SOPRANO Voice Rep': <FaMusic />,
    'ALTO Voice Rep': <FaMusic />,
    'TENOR Voice Rep': <FaMusic />,
    'BASS Voice Rep': <FaMusic />
  };
  return iconMap[title] || <FaUsers />;
};
  

  // ---------------- Notifications ----------------
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  const refs = {
    home: useRef(null),
    media: useRef(null),
    youtube: useRef(null),
    events: useRef(null),
    hymns: useRef(null),
    about: useRef(null),
    connect: useRef(null),
    mass: useRef(null),
    contact: useRef(null),
  };

  const current = slides[currentSlide];

  // ------------------------------------------------------------
  // Toast helper — used instead of window.alert throughout
  // ------------------------------------------------------------
  const showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.className = `zuca-toast ${type === "error" ? "zuca-toast-error" : ""}`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("zuca-toast-out");
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  };

  // ------------------------------------------------------------
  // Slideshow controls
  // ------------------------------------------------------------
  const nextSlide = () => setCurrentSlide((s) => (s + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((s) => (s - 1 + slides.length) % slides.length);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(nextSlide, 5500);
    return () => clearInterval(timer);
  }, [playing]);

  // ------------------------------------------------------------
  // Scroll spy
  // ------------------------------------------------------------
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
      const y = window.scrollY + 160;
      for (const [id, ref] of Object.entries(refs)) {
        if (!ref.current) continue;
        const top = ref.current.offsetTop;
        const bottom = top + ref.current.offsetHeight;
        if (y >= top && y < bottom) {
          setActiveSection(id);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollTo = (id) => {
    refs[id]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };
  const go = (path) => navigate(path);

  // ------------------------------------------------------------
  // 1. GET /api/public/featured-media?limit=10
  // ------------------------------------------------------------
  useEffect(() => {
    const fetchFeaturedMedia = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/public/featured-media?limit=10`);
        const data = response.data.media || response.data;
        setMedia(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching featured media:", err);
        setMedia([]);
      } finally {
        setLoadingMedia(false);
      }
    };
    fetchFeaturedMedia();
  }, []);

  // ------------------------------------------------------------
  // 2. GET /api/public/upcoming-events?limit=4
  // ------------------------------------------------------------
  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/public/upcoming-events?limit=4`);
        if (response.data && response.data.events) {
          setEvents(response.data.events);
        } else if (Array.isArray(response.data)) {
          setEvents(response.data);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error("Error fetching upcoming events:", err);
        setEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchUpcomingEvents();
  }, []);

  // ------------------------------------------------------------
  // 3. GET /api/public/youtube-top?limit=3
  // ------------------------------------------------------------
  useEffect(() => {
    const fetchTopVideos = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/public/youtube-top?limit=3`);
        if (response.data.success && response.data.videos && response.data.videos.length > 0) {
          setVideos(response.data.videos);
        } else {
          setVideos([]);
        }
      } catch (err) {
        console.error("YouTube API error:", err.message);
        setVideos([]);
      } finally {
        setLoadingVideos(false);
      }
    };
    fetchTopVideos();
  }, []);

  // ------------------------------------------------------------
  // 4. GET /api/history/public
  // ------------------------------------------------------------
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/history/public`);
        if (response.data.success) {
          setHistory(response.data.history);
        }
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);


  // ------------------------------------------------------------
// GET /api/executive/team - Get current executive team
// ------------------------------------------------------------
const [executiveTeam, setExecutiveTeam] = useState([]);


useEffect(() => {
  const fetchExecutiveTeam = async () => {
    try {
      console.log("🔍 Fetching executive team...");
      const response = await axios.get(`${BASE_URL}/api/executive/team`);
      console.log("📊 Response:", response.data);
      
      if (response.data && response.data.executives) {
        // The API returns executives array with user data
        const allExecutives = response.data.executives.map(exec => ({
          id: exec.id,
          name: exec.name || exec.user?.fullName || 'Unknown',
          role: exec.role || exec.position?.title || 'Member',
          category: exec.category || exec.position?.category || 'general',
          level: exec.level || exec.position?.level || 0,
          description: exec.description || exec.position?.description || '',
          phone: exec.phone || exec.user?.phone || null,
          email: exec.email || exec.user?.email || null,
          profileImage: exec.profileImage || exec.user?.profileImage || null,
          whatsappLink: exec.whatsappLink || null,
          callLink: exec.callLink || null
        }));
        setExecutiveTeam(allExecutives);
        console.log("✅ Executive team loaded:", allExecutives.length, "members");
        console.log("📋 First member:", allExecutives[0]);
      } else {
        console.warn("⚠️ No executives found in response");
        setExecutiveTeam([]);
      }
    } catch (err) {
      console.error("❌ Error fetching executive team:", err);
      setExecutiveTeam([]);
    } finally {
      setLoadingExecutives(false);
    }
  };
  fetchExecutiveTeam();
}, []);

  // ------------------------------------------------------------
  // 5. GET /api/public/hymns?page=1&limit=12
  // 6. GET /api/public/hymns/search/{query}?limit=20
  // ------------------------------------------------------------
  const fetchHymns = async (page = 1, search = "") => {
    try {
      if (search) {
        const response = await axios.get(
          `${BASE_URL}/api/public/hymns/search/${encodeURIComponent(search)}?limit=20`
        );
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
            setHymns((prev) => [...prev, ...response.data.hymns]);
          }
          setHasMoreHymns(response.data.hasMore);
        }
      }
    } catch (err) {
      console.error("Error fetching hymns:", err);
    } finally {
      setLoadingHymns(false);
    }
  };

  useEffect(() => {
    fetchHymns(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHymnSearch = (e) => {
    e.preventDefault();
    if (hymnSearch.trim().length >= 2) {
      setLoadingHymns(true);
      setIsSearching(true);
      fetchHymns(1, hymnSearch);
    }
  };

  const clearSearch = () => {
    setHymnSearch("");
    setIsSearching(false);
    setSearchResults([]);
    setLoadingHymns(true);
    fetchHymns(1, "");
  };

  const loadMoreHymns = () => {
    if (hasMoreHymns && !isSearching) {
      const nextPage = hymnsPage + 1;
      setHymnsPage(nextPage);
      fetchHymns(nextPage, "");
    }
  };

  // ------------------------------------------------------------
  // 7. GET /api/public/hymns/search/{query}?limit=8  (live suggestions)
  // ------------------------------------------------------------
  const handleSearchInput = async (e) => {
    const value = e.target.value;
    setHymnSearch(value);

    if (value.trim().length >= 2) {
      setIsSearchingLive(true);
      setShowSuggestions(true);
      try {
        const response = await axios.get(
          `${BASE_URL}/api/public/hymns/search/${encodeURIComponent(value)}?limit=8`
        );
        if (response.data.success) {
          setSearchSuggestions(response.data.hymns);
        }
      } catch (err) {
        console.error("Live search error:", err);
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
    try {
      const response = await axios.get(
        `${BASE_URL}/api/public/hymns/search/${encodeURIComponent(suggestion.title)}?limit=20`
      );
      if (response.data.success) {
        setSearchResults(response.data.hymns);
      }
    } catch (err) {
      console.error("Error fetching suggested hymn:", err);
    } finally {
      setLoadingHymns(false);
    }
  };

  // ------------------------------------------------------------
  // 8. GET /api/public/hymns/{id}
  // ------------------------------------------------------------
  const viewHymn = async (id) => {
    try {
      setLoadingHymnDetails(true);
      const response = await axios.get(`${BASE_URL}/api/public/hymns/${id}`);
      if (response.data.success) {
        setSelectedHymn(response.data.hymn);
        setShowHymnModal(true);
        document.body.style.overflow = "hidden";
      }
    } catch (err) {
      console.error("Error fetching hymn details:", err);
      showToast("Couldn't load that hymn. Please try again.", "error");
    } finally {
      setLoadingHymnDetails(false);
    }
  };

  const closeHymnModal = () => {
    setShowHymnModal(false);
    setSelectedHymn(null);
    document.body.style.overflow = "auto";
  };

  // ------------------------------------------------------------
  // Hymn download — image
  // ------------------------------------------------------------
  const downloadHymnAsImage = async (hymn) => {
    try {
      setDownloading(true);
      const element = document.createElement("div");
      element.style.cssText = `
        padding: 40px;
        background: #ffffff;
        font-family: 'Georgia', 'Times New Roman', serif;
        max-width: 600px;
        margin: 0 auto;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      `;

      const lyricsHtml = hymn.lyrics
        ? hymn.lyrics
            .split("\n")
            .map(
              (line) =>
                `<p style="margin: 8px 0; text-align: center; font-size: 16px; line-height: 1.6; color:#111827;">${
                  line || " "
                }</p>`
            )
            .join("")
        : '<p style="text-align: center; color: #999;">Lyrics not available</p>';

      element.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #5b21b6; font-size: 28px; margin-bottom: 10px;">${hymn.title}</h1>
          ${hymn.reference ? `<p style="color: #667085; font-size: 14px;">${hymn.reference}</p>` : ""}
          <div style="width: 60px; height: 3px; background: #d5a63b; margin: 20px auto;"></div>
        </div>
        <div style="margin-bottom: 30px;">${lyricsHtml}</div>
        <div style="text-align: center; margin-top: 40px; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          ZUCA Hymn Book • Generated on ${new Date().toLocaleDateString()}
        </div>
      `;

      document.body.appendChild(element);

      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff", logging: false });

      document.body.removeChild(element);

      const link = document.createElement("a");
      link.download = `${hymn.title.replace(/[^a-z0-9]/gi, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      showToast("Image downloaded successfully.");
    } catch (error) {
      console.error("Image download failed:", error);
      showToast("Failed to download image. Please try again.", "error");
    } finally {
      setDownloading(false);
    }
  };

  // ------------------------------------------------------------
  // Hymn download — PDF
  // ------------------------------------------------------------
  const downloadHymnAsPDF = async (hymn) => {
    try {
      setDownloading(true);
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 40;
      let y = margin + 20;

      pdf.setFontSize(24);
      pdf.setTextColor(91, 33, 182);
      pdf.setFont("helvetica", "bold");
      pdf.text(hymn.title, pageWidth / 2, y, { align: "center" });
      y += 30;

      if (hymn.reference) {
        pdf.setFontSize(14);
        pdf.setTextColor(100, 116, 139);
        pdf.setFont("helvetica", "normal");
        pdf.text(hymn.reference, pageWidth / 2, y, { align: "center" });
        y += 40;
      } else {
        y += 20;
      }

      pdf.setDrawColor(213, 166, 59);
      pdf.line(margin + 100, y - 10, pageWidth - margin - 100, y - 10);

      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont("helvetica", "normal");

      if (hymn.lyrics) {
        const cleanLyrics = hymn.lyrics.replace(/\*\*([^*]+)\*\*/g, "$1");
        const lines = cleanLyrics.split("\n");
        for (const line of lines) {
          if (line.trim() === "") {
            y += 12;
          } else {
            if (y > pdf.internal.pageSize.getHeight() - margin) {
              pdf.addPage();
              y = margin + 20;
            }
            pdf.text(line, pageWidth / 2, y, { align: "center" });
            y += 20;
          }
        }
      }

      y = pdf.internal.pageSize.getHeight() - margin;
      pdf.setFontSize(10);
      pdf.setTextColor(148, 163, 184);
      pdf.text("ZUCA Hymn Book", margin, y);
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth - margin - 150, y);

      pdf.save(`${hymn.title.replace(/[^a-z0-9]/gi, "_")}.pdf`);
      showToast("PDF downloaded successfully.");
    } catch (error) {
      console.error("PDF download failed:", error);
      showToast("Failed to download PDF. Please try again.", "error");
    } finally {
      setDownloading(false);
    }
  };

  // ------------------------------------------------------------
  // Media modal
  // ------------------------------------------------------------
  const openMediaModal = (item) => {
    setSelectedMedia(item);
    setIsMediaModalOpen(true);
    document.body.style.overflow = "hidden";
  };
  const closeMediaModal = () => {
    setIsMediaModalOpen(false);
    setSelectedMedia(null);
    document.body.style.overflow = "auto";
  };

  // ------------------------------------------------------------
  // Video modal
  // ------------------------------------------------------------
  const openVideoModal = (video) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
    document.body.style.overflow = "hidden";
  };
  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setSelectedVideo(null);
    document.body.style.overflow = "auto";
  };

  const formatDuration = (duration) => {
    if (!duration) return "";
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatEventDate = (dateString) => {
    const d = new Date(dateString);
    return {
      day: d.getDate(),
      month: d.toLocaleString("default", { month: "short" }),
      weekday: d.toLocaleString("default", { weekday: "short" }),
      full: d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    };
  };

  // ------------------------------------------------------------
  // PWA install
  // ------------------------------------------------------------
  useEffect(() => {
    const beforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);

    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (isPWA) setShowInstall(false);

    return () => window.removeEventListener("beforeinstallprompt", beforeInstall);
  }, []);

  const installPortal = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        setInstallPrompt(null);
        setShowInstall(false);
      }
    } else {
      showToast(
        "Use your browser menu → “Add to Home Screen” / “Install App” to install ZUCA Portal.",
        "success"
      );
    }
  };

  // ------------------------------------------------------------
  // Notification prompt
  // ------------------------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    const notificationsPrompted = localStorage.getItem("notificationsPrompted");
    if (
      token &&
      !notificationsPrompted &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      const timer = setTimeout(() => setShowNotificationPrompt(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="zuca-landing">
      <div className="zuca-topbar">
        <div className="zuca-shell zuca-topbar-inner">
          <span>
            <FaChurch /> Zetech University Catholic Action
          </span>
          <span>Weekly Mass · Wednesday 4:30 PM</span>
        </div>
      </div>

      <header className={`zuca-navbar ${scrolled ? "is-scrolled" : ""}`}>
        <div className="zuca-shell zuca-nav-inner">
          <button className="zuca-brand" onClick={() => scrollTo("home")} aria-label="ZUCA Home">
            <img src={logo} alt="ZUCA" />
            <span>
              <strong>ZUCA</strong>
              <small>Zetech University Catholic Action</small>
            </span>
          </button>

          <nav className="zuca-desktop-nav">
  {navItems.map(([id, label]) => (
    <button
      key={id}
      className={activeSection === id ? "active" : ""}
      onClick={() => scrollTo(id)}
    >
      {label}
    </button>
  ))}
  
  {/* NEW BUTTONS - Add these after the existing nav items */}
  <button 
    className="zuca-nav-link" 
    onClick={() => navigate("/gallery")}
  >
    <FaImages /> Gallery
  </button>
  
  <button 
    className="zuca-nav-link" 
    onClick={() => navigate("/prayer")}
  >
    <FaBookOpen /> Prayer Book
  </button>
  
  <button 
    className="zuca-nav-link" 
    onClick={() => navigate("/liturgical-calendar")}
  >
    <FaCalendarCheck /> Calendar
  </button>
</nav>
          

          

          <button className="zuca-menu-button" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {menuOpen && (
          <div className="zuca-mobile-menu">
            {navItems.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)}>
                {label}
              </button>
            ))}
            <div className="mobile-menu-actions">
              <button onClick={() => go("/login")}>
                <FaSignInAlt /> Sign In
              </button>
              <button onClick={() => go("/register")}>
                <FaUserPlus /> Create Account
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* HERO */}
        <section
          ref={refs.home}
          className="zuca-hero"
          onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStart.current == null) return;
            const diff = touchStart.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) (diff > 0 ? nextSlide() : prevSlide());
            touchStart.current = null;
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={slide.image}
              className={`hero-slide ${i === currentSlide ? "visible" : ""}`}
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          ))}
          <div className="hero-overlay" />

          <div className="zuca-shell hero-content">
            <div className="hero-copy">
              <div className="hero-eyebrow">
                <span />
                {current.eyebrow}
              </div>
              <h1>{current.title}</h1>
              <p>{current.text}</p>

              <div className="hero-actions">
                <button className="hero-primary" onClick={() => go("/register")}>
                  <strong>Join ZUCA </strong><FaArrowRight />
                </button>
                <button className="hero-secondary" onClick={() => go("/login")}>
                  <FaSignInAlt /> <strong>Log In</strong>
                </button>
              </div>

              <button className="hero-explore" onClick={() => navigate('/home')}>
  Explore the portal <FaArrowRight />
</button>
            </div>

             {/* NEW - Mobile Feature Buttons Row (visible on all screen sizes but styled for mobile) */}
    <div className="mobile-feature-row">
      <button 
        onClick={() => navigate("/gallery")} 
        className="mobile-feature-btn-hero"
      >
        <FaImages /> Gallery
      </button>
      <button 
        onClick={() => navigate("/prayer")} 
        className="mobile-feature-btn-hero"
      >
        <FaBookOpen /> Prayer Book
      </button>
      <button 
        onClick={() => navigate("/liturgical-calendar")} 
        className="mobile-feature-btn-hero"
      >
        <FaCalendarCheck /> Calendar
      </button>
    </div>


            <div className="hero-bottom">
              <div className="hero-dots">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Go to slide ${i + 1}`}
                    className={i === currentSlide ? "active" : ""}
                    onClick={() => setCurrentSlide(i)}
                  />
                ))}
              </div>

              <div className="hero-controls">
                <span>
                  {String(currentSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
                </span>
                <button onClick={prevSlide} aria-label="Previous">
                  <FaChevronLeft />
                </button>
                <button onClick={() => setPlaying((v) => !v)} aria-label="Play or pause">
                  {playing ? <FaPause /> : <FaPlay />}
                </button>
                <button onClick={nextSlide} aria-label="Next">
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT / INTRO */}
        <section ref={refs.about} className="zuca-section zuca-intro">
          <div className="zuca-shell intro-grid">
            <div>
              <span className="section-kicker">WELCOME TO ZUCA</span>
              <h2>
                A Catholic students club built  around faith and Unity.
              </h2>
            </div>
            <div className="intro-text">
              <p>
                Zetech Catholic Action is a vibrant student group committed to evangelism, faith, and fellowship through music and action. Our mission is to spread the message of hope, love, and faith within our campus community and beyond. . The ZUCA Portal makes the Club easier to discover and stay
                connected with our media, hymns, events and Mass information, all in one place <strong><em>"THE ZUCA PORTAL</em>"</strong>                     
              </p>
              <button className="text-link" onClick={() => go("/register")}>
                Become part of our club online? <FaArrowRight />
              </button>
            </div>
          </div>

          <div className="zuca-shell feature-grid">
            <article>
              <div className="feature-icon">
                <FaPray />
              </div>
              <h3>Prayer</h3>
              <p>Join Us everyday from monday as we gather to pray the holy Rosary together.</p>
            </article>
            <article>
              <div className="feature-icon">
                <FaUsers />
              </div>
              <h3>Interactive ZUCA</h3>
              <p>Engage with us and be able to Connect with fellow students and even get a better university experience.</p>
            </article>
            <article>
              <div className="feature-icon">
                <FaHandsHelping />
              </div>
              <h3>Service to others</h3>
              <p>As ZUCA, it's all through compassion and service, we usually enage ourself in community service as we purpose also to serve others who are less fortunate by charitable visits and donations.</p>
            </article>
            <article>
              <div className="feature-icon">
                <FaMusic />
              </div>
              <h3>Hymn book</h3>
              <p>Search, read and download hymns from the ZUCA hymn book.</p>
            </article>
          </div>
        </section>

        {/* FEATURED MEDIA */}
        <section ref={refs.media} id="media" className="zuca-section">
          <div className="zuca-shell">
            <div className="section-heading">
              <div>
                <span className="section-kicker">FROM OUR FAVORITE CONTENT</span>
                <h2>Moments worth remembering</h2>
              </div>
              <button className="outline-button" onClick={() => go("/gallery")}>
                Explore our gallery <FaArrowRight />
              </button>
            </div>

            {loadingMedia ? (
              <div className="state-block">Loading featured media…</div>
            ) : media.length ? (
              <div className="media-grid">
                {media.slice(0, 5).map((item, i) => (
                  <article
                    className={`media-card media-${i + 1}`}
                    key={item.id || i}
                    onClick={() => openMediaModal(item)}
                  >
                    {item.type === "video" ? (
                      <video src={item.url} className="media-card-video" muted playsInline preload="metadata" />
                    ) : (
                      <img src={item.url || item.thumbnail} alt={item.title || "ZUCA community"} />
                    )}
                    <div className="media-caption">
                      <span>ZUCA</span>
                      <h3>{item.title || "Community moment"}</h3>
                      <div className="media-caption-stats">
                        <span>♥ {item._count?.likes || 0}</span>
                        <span>◎ {item._count?.views || 0}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-card">
                <FaHeart />
                <h3>Our community moments</h3>
                <p>Photos and featured media will appear here.</p>
              </div>
            )}
          </div>
        </section>

        {/* Full-screen media modal */}
        {isMediaModalOpen && selectedMedia && (
          <div className="zuca-modal" onClick={closeMediaModal}>
            <div className="zuca-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="zuca-modal-close" onClick={closeMediaModal}>
                <FaTimes />
              </button>
              {selectedMedia.type === "video" ? (
                <video src={selectedMedia.url} className="zuca-modal-media" controls autoPlay preload="metadata" />
              ) : (
                <img src={selectedMedia.url} alt={selectedMedia.title} className="zuca-modal-media" />
              )}
              <div className="zuca-modal-body">
                <h3>{selectedMedia.title}</h3>
                {selectedMedia.description && <p>{selectedMedia.description}</p>}
                <div className="zuca-modal-stats">
                  <span>♥ {selectedMedia._count?.likes || 0} likes</span>
                  <span>◎ {selectedMedia._count?.views || 0} views</span>
                  {selectedMedia.createdAt && (
                    <span>{new Date(selectedMedia.createdAt).toLocaleDateString()}</span>
                  )}
                </div>
                <button
                  className="hero-primary"
                  onClick={() => {
                    closeMediaModal();
                    go("/gallery");
                  }}
                >
                  View full gallery <FaArrowRight />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIDEOS */}
        <section className="zuca-video-section" ref={refs.youtube} id="youtube">
          <div className="zuca-shell video-grid">
            <div className="video-copy">
              <span className="section-kicker">WATCH &amp; LISTEN FROM OUR ONLINE PLATFORMS</span>
              <h2>connect us wherever you are By subscribing to our online platforms.</h2>
              <p>Catch up with our latest updates, events and content from ZUCA.</p>
              <a
                className="hero-primary dark-button"
                href="https://www.youtube.com/@zetechUniversityCatholic"
                target="_blank"
                rel="noopener noreferrer"
              >
                Subscribe on YouTube <FaYoutube size="20px" color="#f70000" />

              </a>
            </div>
            <div className="video-list">
              {loadingVideos ? (
                <div className="video-empty">Loading videos…</div>
              ) : videos.length ? (
                videos.map((video, i) => (
                  <article
                    className="video-item"
                    key={video.id || i}
                    onClick={() => openVideoModal(video)}
                  >
                    <div className="video-thumb">
                      <img src={video.thumbnail} alt={video.title} />
                      <span>
                        <FaPlay />
                      </span>
                      <em>{formatDuration(video.duration)}</em>
                    </div>
                    <div>
                      <small>YouTube</small>
                      <h3>{video.title || "ZUCA video"}</h3>
                      <div className="video-item-stats">
                        <span>{(video.views || 0).toLocaleString()} views</span>
                        <span>{(video.likes || 0).toLocaleString()} likes</span>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="video-empty">
                  No videos available yet.
                  <a
                    href="https://www.youtube.com/@zetechUniversityCatholic"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Subscribe to our channel
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Video modal */}
        {isVideoModalOpen && selectedVideo && (
          <div className="zuca-modal" onClick={closeVideoModal}>
            <div className="zuca-modal-card zuca-modal-card-wide" onClick={(e) => e.stopPropagation()}>
              <button className="zuca-modal-close" onClick={closeVideoModal}>
                <FaTimes />
              </button>
              <div className="zuca-video-frame">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0&modestbranding=1`}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="zuca-modal-body">
                <h3>{selectedVideo.title}</h3>
                <div className="zuca-modal-stats">
                  <span>{(selectedVideo.views || 0).toLocaleString()} views</span>
                  <span>{(selectedVideo.likes || 0).toLocaleString()} likes</span>
                  <span>{(selectedVideo.comments || 0).toLocaleString()} comments</span>
                </div>
                {selectedVideo.description && (
                  <p>{selectedVideo.description.substring(0, 220)}…</p>
                )}
                <div className="zuca-modal-actions">
                  <a
                    className="hero-primary"
                    href={`https://www.youtube.com/watch?v=${selectedVideo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open on YouTube <FaYoutube />
                  </a>
                  <button className="hero-secondary dark-outline" onClick={closeVideoModal}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EVENTS */}
        <section ref={refs.events} id="events" className="zuca-section soft-section">
          <div className="zuca-shell">
            <div className="section-heading">
              <div>
                <span className="section-kicker"> ZUCA UPCOMING EVENTS</span>
                <h2>Which events are to take place?</h2>
              </div>
              <button className="outline-button" onClick={() => go("/schedules")}>
                View all events <FaArrowRight />
              </button>
            </div>

            {loadingEvents ? (
              <div className="state-block">Loading upcoming events…</div>
            ) : events.length ? (
              <div className="events-grid">
                {events.map((event, i) => {
                  const date = formatEventDate(event.eventDate);
                  return (
                    <article className="event-card" key={event.id || i}>
                      <div className="event-date">
                        <strong>{date.day}</strong>
                        <span>{date.month}</span>
                      </div>
                      <div>
                        <span className="event-weekday">{date.weekday}</span>
                        <h3>{event.title}</h3>
                        <div className="event-meta">
                          <span>
                            <FaClock /> {event.eventTime || "4:30 PM"}
                          </span>
                          <span>
                            <FaLocationArrow /> {event.location || "Annex Building 002"}
                          </span>
                        </div>
                        {event.description && <p>{event.description}</p>}
                        <button
                          className="event-remind"
                          onClick={() =>
                            showToast(
                              `${event.title} — ${date.weekday}, ${date.full || ""} at ${
                                event.eventTime || "4:30 PM"
                              }, ${event.location || "Annex Building 002"}.`
                            )
                          }
                        >
                          <FaClock /> Set reminder
                        </button>
                      </div>
                      <FaArrowRight 
  className="event-arrow" 
  style={{ cursor: 'pointer' }}
  onClick={(e) => {
    e.stopPropagation();
    navigate('/schedules', { 
      state: { 
        eventId: event.id,
        title: event.title,
        location: event.location || "Annex Building 002",
        eventTime: event.eventTime || "4:30 PM",
        description: event.description,
        eventDate: event.eventDate
      } 
    });
  }}
/>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-card">
                <FaCalendarAlt />
                <h3>No upcoming events yet</h3>
                <p>Check back soon for the next ZUCA  event.</p>
              </div>
            )}
          </div>
        </section>

        {/* HYMNS */}
        <section ref={refs.hymns} id="hymns" className="zuca-section hymn-section">
          <div className="zuca-shell hymn-layout">
            <div className="hymn-copy">
              <div className="hymn-symbol">
                <FaMusic />
              </div>
              <span className="section-kicker">ZUCA LRICS BOOK</span>
              <h2>Find the Lyrics of a catholic song you need.</h2>
              <p>Search From our  collection, read the lyrics and keep a copy by downloading as <FaFilePdf color="#ff0000"/> PDF or <FaFileWord color="#221ef3" /> WORD document.</p>
              <button className="outline-button" onClick={() => go("/hymns")}>
                Open hymn book <FaArrowRight />
              </button>
            </div>

            <div className="hymn-panel">
              <form className="hymn-search" onSubmit={handleHymnSearch}>
                <FaSearch />
                <input
                  value={hymnSearch}
                  onChange={handleSearchInput}
                  onFocus={() => {
                    if (hymnSearch.trim().length >= 2) setShowSuggestions(true);
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="  Search hymns by title or lyrics…"
                />
                <button type="submit"><FaSearch size="15px" color="#fff"/>     Search</button>
                {isSearching && (
                  <button type="button" className="hymn-clear" onClick={clearSearch}>
                    Clear
                  </button>
                )}

                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="hymn-suggestions">
                    {searchSuggestions.map((s) => (
                      <div
                        key={s.id}
                        className="hymn-suggestion-item"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectSuggestion(s)}
                      >
                        <FaMusic />
                        <div>
                          <strong>{s.title}</strong>
                          {s.preview && <small>{s.preview.substring(0, 60)}…</small>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {isSearchingLive && <div className="hymn-suggestions hymn-suggestions-loading">Searching…</div>}
              </form>

              {loadingHymns ? (
                <div className="hymn-loading">Loading hymn book…</div>
              ) : (isSearching ? searchResults : hymns).length ? (
                <>
                  <div className="hymn-list">
                    {(isSearching ? searchResults : hymns).map((hymn, i) => (
                      <button className="hymn-row" key={hymn.id || i} onClick={() => viewHymn(hymn.id)}>
                        <span className="hymn-number">{String(i + 1).padStart(2, "0")}</span>
                        <span>
                          <strong>{hymn.title}</strong>
                          <small>{hymn.reference || "ZUCA Hymn Book"}</small>
                        </span>
                        <FaArrowRight />
                      </button>
                    ))}
                  </div>
                  {!isSearching && hasMoreHymns && (
                    <button className="hymn-load-more" onClick={loadMoreHymns}>
                      Load more hymns
                    </button>
                  )}
                </>
              ) : (
                <div className="hymn-loading">
                  No hymns found.
                  {isSearching && (
                    <button className="text-link" onClick={clearSearch}>
                      Browse all hymns
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Hymn detail modal */}
        {(showHymnModal || loadingHymnDetails) && (
          <div className="zuca-modal" onClick={closeHymnModal}>
            <div className="zuca-modal-card zuca-hymn-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="zuca-modal-close" onClick={closeHymnModal}>
                <FaTimes />
              </button>

              {loadingHymnDetails ? (
                <div className="hymn-modal-loading">Loading hymn lyrics…</div>
              ) : (
                <>
                  <div className="hymn-modal-header">
                    <FaMusic />
                    <h2>{selectedHymn?.title}</h2>
                    {selectedHymn?.reference && <span>{selectedHymn.reference}</span>}
                  </div>
                  <div className="hymn-modal-lyrics">
                    {selectedHymn?.lyrics ? (
                      selectedHymn.lyrics.split("\n").map((line, i) => <p key={i}>{line || <br />}</p>)
                    ) : (
                      <p className="hymn-modal-empty">Lyrics not available yet.</p>
                    )}
                  </div>
                  <div className="hymn-modal-actions">
                    <button onClick={() => downloadHymnAsImage(selectedHymn)} disabled={downloading}>
                      <FaImage /> Save as image
                    </button>
                    <button onClick={() => downloadHymnAsPDF(selectedHymn)} disabled={downloading}>
                      <FaFilePdf /> Save as PDF
                    </button>
                  </div>
                  <button
                    className="hero-primary"
                    onClick={() => {
                      closeHymnModal();
                      go("/hymns");
                    }}
                  >
                    View all hymns <FaArrowRight />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* MASS + CHOIR */}
        <section className="zuca-mass-strip" ref={refs.mass} id="mass">
          <div className="zuca-shell mass-inner">
            <div className="mass-icon">
              <FaChurch />
            </div>
            <div>
              <span>WEEKLY MASS</span>
              <strong>In ZUCA we usually have our mass on Wednesdays at  · 4:30 PM at the Zetech Universiry Ruiru Campus join us as we animate In the Holy Mass <FaPrayingHands/></strong>
            </div>
            <div className="mass-location">
              <FaMapMarkerAlt /> Annex Building 002, Zetech University
            </div>
          </div>

          <div className="zuca-shell mass-cards">
            <article>
              <img src={logo} alt="Loading..." style={{ width: '34px', height: '50px' }} />
              <h3>Wednesday Mass</h3>
              <p>
                <FaClock /> 4:30 PM
              </p>
              <p>
                <FaLocationArrow /> Annex Building 002
              </p>
              <span>Come join us!</span>
            </article>
            <article>
              <FaMusic color="#991bb3" />
              <h3>Daily choir practice</h3>
              <p>
                <FaClock /> 4:00 PM – 6:00 PM
              </p>
              <p>
                <FaLocationArrow /> Zetech Annex 002
              </p>
              <span>All are welcome to attend</span>
            </article>
          </div>
        </section>

        {/* CONNECT / SOCIAL */}
        <section ref={refs.connect} id="connect" className="zuca-section connect-section">
          <div className="zuca-shell">
            <div className="section-heading">
              <div>
                <span className="section-kicker">FOLLOW ALONG</span>
                <h2>Follow us on All our social media Platforms;</h2>
              </div>
            </div>

            <div className="connect-grid">
              <a
                href="https://www.instagram.com/zetechcatholicaction?igsh=d211Y2htZW9qbGU3"
                target="_blank"
                rel="noopener noreferrer"
                className="connect-card"
              >
                <span className="connect-icon connect-instagram">
                  <FaInstagram />
                </span>
                <strong>Instagram</strong>
                <small>@zetechcatholicaction</small>
              </a>
              <a
                href="https://www.facebook.com/share/1ELDK56qEJ"
                target="_blank"
                rel="noopener noreferrer"
                className="connect-card"
              >
                <span className="connect-icon connect-facebook">
                  <FaFacebookF />
                </span>
                <strong>Facebook</strong>
                <small>Zetech Catholic Action</small>
              </a>
              <a
                href="https://www.youtube.com/@zetechUniversityCatholic"
                target="_blank"
                rel="noopener noreferrer"
                className="connect-card"
              >
                <span className="connect-icon connect-youtube">
                  <FaYoutube />
                </span>
                <strong>YouTube</strong>
                <small>Subscribe for new releases</small>
              </a>
              <a
                href="https://www.tiktok.com/@zetechcatholicaction?_t=ZM-8yeypKK8YpM&_r=1"
                target="_blank"
                rel="noopener noreferrer"
                className="connect-card"
              >
                <span className="connect-icon connect-tiktok">
                  <FaTiktok />
                </span>
                <strong>TikTok</strong>
                <small>@zetechcatholicaction</small>
              </a>
            </div>
          </div>
        </section>

     {/* ABOUT / HISTORY */}
<section className="zuca-section story-section">
  <div className="zuca-shell story-grid">
    <div className="story-image">
      {/* First image - main image */}
      <img src={slide8} alt="ZUCA community" className="story-image-main" />
      {/* Second image - below the first one */}
      <img src={slide10} alt="ZUCA community service" className="story-image-secondary" />
      <img src={fau} alt="ZUCA community service" className="story-image-secondary1" />
      <img src={dayson} alt="ZUCA community service" className="story-image-secondary1" /> 
      <img src={slide2} alt="ZUCA community service" className="story-image-secondary1" /> 
      
     
    </div>
    
    <div className="story-copy">
      <span className="section-kicker">OUR STORY</span>
      <h2>
        More than a portal. A Big Family.
      </h2>
      
      {loadingHistory ? (
        <p>Loading our history…</p>
      ) : history.length ? (
        history.map((entry, index) => (
          <div key={entry.id}>
            <div className="story-entry">
              <h4>{entry.title}</h4>
              <p>{entry.content}</p>
            </div>
            
            {/* Insert images between history entries - mobile only */}
            {index === 3 && (
              <div className="story-inline-image mobile-only">
                <img src={fau} alt="ZUCA community" />
              </div>
            )}
            
            {index === 4 && (
              <div className="story-inline-image mobile-only">
                <img src={dayson} alt="ZUCA community service" />
              </div>
            )}

             {index === 5 && (
              <div className="story-inline-image mobile-only">
                <img src={slide2} alt="ZUCA community service" />
              </div>
            )}
            
          </div>
        ))
        
      ) : (
        <p>
          ZUCA is a community of young Catholics growing in faith, friendship and service at
          Zetech University.
        </p>
      )}

      <div className="story-tags">
        <span>
          <FaMusic /> Choir practice / Mass animations
        </span>
        <span>
          <FaUsers /> Jumuia groups
        </span>
        <span>
          <FaHandsHelping /> Outdoor &amp; indoor functions
        </span>
      </div>
    </div>
  </div>
</section>

      {/* CONTACT */}
<section ref={refs.contact} id="contact" className="zuca-section soft-section">
  <div className="zuca-shell">
    <div className="section-heading">
      <div>
        <span className="section-kicker">REACH US</span>
        <h2>Get in touch</h2>
      </div>
    </div>

    {loadingExecutives ? (
      <div className="state-block">Loading contact information…</div>
    ) : executiveTeam.length === 0 ? (
      <div className="state-block">No executive team found</div>
    ) : (
      <div className="contact-grid">
        {/* Email 1 */}
        <div className="contact-item">
          <FaEnvelope style={{ fontSize: '24px', color: '#2d2a35' }} />
          <a href="mailto:zuca406@gmail.com" style={{ fontWeight: '600' }}>zuca406@gmail.com</a>
        </div>
        
        {/* Email 2 */}
        <div className="contact-item">
          <FaEnvelope style={{ fontSize: '24px', color: '#2d2a35' }} />
          <a href="mailto:zucaportal2025@gmail.com" style={{ fontWeight: '600' }}>zucaportal2025@gmail.com</a>
        </div>
        
        {/* Show Chairperson, Vice Chairperson, and Christopher Maina */}
        {executiveTeam
          .filter(member => {
            const role = member.role?.toLowerCase() || '';
            const name = member.name?.toLowerCase() || '';
            return role === 'chairperson' || 
                   role === 'vice chairperson' || 
                   name === 'christopher maina' ||
                   name.includes('christopher maina') ||
                   name === 'chris maina' ||
                   name.includes('chris maina');
          })
          .sort((a, b) => {
            const aRole = a.role?.toLowerCase() || '';
            const bRole = b.role?.toLowerCase() || '';
            const aName = a.name?.toLowerCase() || '';
            const bName = b.name?.toLowerCase() || '';
            
            const aIsChris = aName === 'christopher maina' || aName.includes('christopher maina');
            const bIsChris = bName === 'christopher maina' || bName.includes('christopher maina');
            
            if (aRole === 'chairperson') return -1;
            if (bRole === 'chairperson') return 1;
            if (aRole === 'vice chairperson') return -1;
            if (bRole === 'vice chairperson') return 1;
            if (aIsChris && !bIsChris) return 1;
            if (!aIsChris && bIsChris) return -1;
            return 0;
          })
          .map((member) => {
            const isChris = member.name?.toLowerCase() === 'christopher maina' || 
                           member.name?.toLowerCase().includes('christopher maina');
            return (
              <div className="contact-item" key={member.id}>
                {member.profileImage ? (
                  <img 
                    src={member.profileImage} 
                    alt={member.name} 
                    style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    borderRadius: '50%', 
                    background: isChris ? '#2d2a35' : '#d5a63b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#fff'
                  }}>
                    {member.name?.charAt(0) || '?'}
                  </div>
                )}
                <span style={{ fontWeight: '700', fontSize: '15px' }}>{member.name}</span>
                <span style={{ 
                  fontWeight: '600', 
                  fontSize: '13px', 
                  color: isChris ? '#2d2a35' : '#d5a63b' 
                }}>
                  {isChris ? 'IT Support' : member.role}
                </span>
                {member.phone && (
                  <a href={`tel:${member.phone}`} style={{ fontSize: '12px', color: '#667085' }}>
                    <FaPhone style={{ marginRight: '4px' }} /> {member.phone}
                  </a>
                )}
                {member.email && (
                  <a href={`mailto:${member.email}`} style={{ fontSize: '11px', color: '#667085' }}>
                    {member.email}
                  </a>
                )}
                {isChris && (
                  <span style={{ 
                    background: '#2d2a35', 
                    color: '#fff', 
                    padding: '2px 12px', 
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}>
                    Tech Support
                  </span>
                )}
              </div>
            );
          })}
        
        {/* Map - Always showing, spans full width */}
        <div className="contact-item" style={{ gridColumn: '1 / -1', padding: '0', overflow: 'hidden' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '16px 20px',
            background: '#f7f7f9',
            width: '100%',
            justifyContent: 'center',
            borderBottom: '1px solid var(--zuca-border)'
          }}>
            <FaMapMarkerAlt style={{ fontSize: '20px', color: '#d5a63b' }} />
            <span style={{ fontWeight: '600' }}>Zetech University, Ruiru Campus</span>
            <a 
              href="https://www.google.com/maps/search/?api=1&query=Zetech+University+Ruiru+Kenya"
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                fontSize: '12px', 
                color: '#d5a63b', 
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              Open in Maps ↗
            </a>
          </div>
          <div style={{ 
            width: '100%', 
            height: '250px',
            backgroundColor: '#e8e8ed'
          }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255282.35853743783!2d36.68297465390024!3d-1.3028610000000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f1172d84d49a7%3A0xf7cf0254b297924c!2sZetech%20University%20-%20Ruiru%20Campus!5e0!3m2!1sen!2ske!4v1700000000000"
              width="100%"
              height="250"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="ZUCA Location"
            />
          </div>
        </div>
      </div>
    )}
    
    {/* View all button - navigates to /executive */}
    {!loadingExecutives && executiveTeam.length > 0 && (
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button 
          className="outline-button"
          onClick={() => navigate('/executive')}
        >
          View all {executiveTeam.length} executives <FaArrowRight />
        </button>
      </div>
    )}
  </div>
</section>

        {/* CTA */}
        <section className="zuca-cta">
          <div className="zuca-shell cta-inner">
            <span className="section-kicker">YOUR JOURNEY STARTS HERE</span>
            <h2>Find your place in the ZUCA family today ! </h2>
            <p> create an account and connect access the full portal.</p>
            <div className="cta-actions">
              <button className="hero-primary" onClick={() => go("/register")}>
                <FaUserPlus /> Create your account
              </button>
              <button className="cta-login" onClick={() => go("/login")}>
                Already a member? Sign in
              </button>
            </div>
          </div>
        </section>

        {showInstall && (
          <div className="install-banner">
            <div>
              <FaDownload />
              <span>
                <strong>Install ZUCA Portal</strong>
                <small>Keep ZUCA one tap away.</small>
              </span>
            </div>
            <button onClick={installPortal}>Install</button>
            <button className="install-close" onClick={() => setShowInstall(false)}>
              <FaTimes />
            </button>
          </div>
        )}
      </main>

      <footer className="zuca-footer">
        <div className="zuca-shell footer-grid">
          <div className="footer-brand">
            <img src={logo} alt="ZUCA" />
            <h3>Zetech University Catholic Action</h3>
            <p>Harmony in Voices · Unity in Purpose</p>
            <div className="socials">
              <a
                href="https://www.instagram.com/zetechcatholicaction"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>
              <a
                href="https://www.facebook.com/share/1ELDK56qEJ"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <FaFacebookF />
              </a>
              <a
                href="https://www.youtube.com/@zetechUniversityCatholic"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
              >
                <FaYoutube />
              </a>
              <a
                href="https://www.tiktok.com/@zetechcatholicaction"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
              >
                <FaTiktok />
              </a>
            </div>
          </div>

          <div>
            <h4>Explore</h4>
            <button onClick={() => scrollTo("about")}>About ZUCA</button>
            <button onClick={() => scrollTo("events")}>Events</button>
            <button onClick={() => scrollTo("media")}>Media</button>
            <button onClick={() => scrollTo("hymns")}>Hymns</button>
          </div>
          <div>
            <h4>Account</h4>
            <button onClick={() => go("/login")}>Sign In</button>
            <button onClick={() => go("/register")}>Register</button>
            <button onClick={installPortal}>Install Portal</button>
          </div>
          <div>
            <h4>Contact</h4>
            <p>
              <FaEnvelope /> zuca406@gmail.com
            </p>
            <p>
              <FaPhone /> +254 798 139 693
            </p>
            <p>
              <FaMapMarkerAlt /> Zetech University, Ruiru
            </p>
          </div>
        </div>

        <div className="zuca-shell footer-bottom">
          <span>© {new Date().getFullYear()} Zetech University Catholic Action</span>
          <span>Built by @CHRISTECH WEBSYS</span>
        </div>
      </footer>

      {showNotificationPrompt && (
        <NotificationPrompt
          onClose={() => {
            setShowNotificationPrompt(false);
            localStorage.setItem("notificationsPrompted", "true");
          }}
        />
      )}
    </div>
  );
}

export default Landing2;
