import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import logo from "../assets/zuca-logo.png";
import {FaChurch, FaMusic, FaBook, FaSun, FaMoon, FaPray, FaPeace, FaHeart, FaStar, FaEnvelope, FaShareAlt} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { 
  FiShare2, 
  FiCalendar, 
  FiMapPin, 
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiDownload,
  FiClock,
  FiHeart,
  FiStar,
  FiPrinter,
  FiMail,
  FiMessageSquare,
  FiVolume2,
  FiEye,
  FiBookmark,
  FiImage
} from "react-icons/fi";
import { 
  BsMusicNoteBeamed, 
  BsBook, 
  BsSun, 
  BsMoonStars,
  BsFlower1,
  BsPeace,
  BsHeart,
  BsStars,
  BsWhatsapp,
  BsTwitter,
  BsMusicNoteList,
  BsPlayCircle,
  BsPauseCircle,
  BsFileWord,
  BsFilePdf,
  BsFileImage
} from "react-icons/bs";
import { 
  GiPrayerBeads,
  GiAngelWings,
  GiChurch,
  GiIncense,
  GiGrain,
  GiHolyGrail,
  GiHolyWater,
  GiVibratingShield
} from "react-icons/gi";
import { MdOutlineRestore, MdOutlineFormatQuote } from "react-icons/md";
import { IoTimeOutline, IoDocumentTextOutline, IoMusicalNotesOutline } from "react-icons/io5";
import { FaTelegramPlane, FaRegKeyboard, FaFileWord, FaFilePdf, FaFileAlt, FaFacebook } from "react-icons/fa";
import BASE_URL from "../api";

// Helper function to parse semicolon-separated songs into array
const parseSongs = (value) => {
  if (!value) return [];
  if (typeof value === 'string' && value.includes(';')) {
    return value.split(';').map(s => s.trim()).filter(s => s);
  }
  if (typeof value === 'string' && value) {
    return [value];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [];
};

// Enhanced song fields with more visibility options
const songFields = [
  { 
    key: "entrance", 
    label: "Entrance", 
    icon: "", 
    category: "opening", 
    color: "#4f46e5", 
    mobileOrder: 1,
    description: "Entrance procession song"
  },
  { 
    key: "mass", 
    label: "Mass", 
    icon: "", 
    category: "liturgy", 
    color: "#7c3aed", 
    mobileOrder: 2,
    description: "lord have mercy and gloriuos"
  },
  { 
    key: "bible", 
    label: "Reading", 
    icon: "", 
    category: "word", 
    color: "#059669", 
    mobileOrder: 3,
    description: "Bible procession song"
  },
  { 
    key: "offertory", 
    label: "Offertory", 
    icon: "", 
    category: "offering", 
    color: "#b45309", 
    mobileOrder: 4,
    description: "Preparation of gifts"
  },
  { 
    key: "procession", 
    label: "Procession", 
    icon: "", 
    category: "procession", 
    color: "#6b7280", 
    mobileOrder: 5,
    description: "Offering procession song"
  },
  { 
    key: "mtakatifu", 
    label: "Mtakatifu", 
    icon: "", 
    category: "special", 
    color: "#8b5cf6", 
    mobileOrder: 6,
    description: "Kylie"
  },
  { 
    key: "signOfPeace", 
    label: "Peace", 
    icon: "", 
    category: "peace", 
    color: "#10b981", 
    mobileOrder: 7,
    description: "Sign of Peace"
  },
  { 
    key: "communion", 
    label: "Communion", 
    icon: "", 
    category: "communion", 
    color: "#991b1b", 
    mobileOrder: 8,
    description: "Communion song"
  },
  { 
    key: "thanksgiving", 
    label: "Thanksgiving", 
    icon: "", 
    category: "thanksgiving", 
    color: "#ec4899", 
    mobileOrder: 9,
    description: "Post-Communion"
  },
  { 
    key: "exit", 
    label: "Exit", 
    icon: "", 
    category: "closing", 
    color: "#4b5563", 
    mobileOrder: 10,
    description: "Recessional song"
  },
];

// Compact mobile view
const mobileCompactFields = songFields.slice(0, 6);

export default function MassPrograms() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openingSong, setOpeningSong] = useState(null); // Track which song is being opened
  const [expandedIds, setExpandedIds] = useState([]);
  const [collapsedIds, setCollapsedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [favorites, setFavorites] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [highlightedSong, setHighlightedSong] = useState(null);
  const [songNotes, setSongNotes] = useState({});
  const [viewMode, setViewMode] = useState('compact');
  const [songPreview, setSongPreview] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    venues: 0,
    upcoming: 0,
    totalHymns: 0,
  });
  const [shareModal, setShareModal] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showDownloadMenu, setShowDownloadMenu] = useState(null);
  const downloadMenuRef = useRef(null);
  
  const token = localStorage.getItem("token");

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close download menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Function to navigate to hymn in hymn book with loading state
  const navigateToHymn = async (hymnTitle, e) => {
    e.stopPropagation();
    
    if (!hymnTitle || hymnTitle === '—' || hymnTitle.trim() === '') return;
    
    // Set loading state for this specific song
    setOpeningSong(hymnTitle);
    
    try {
      // Search for the hymn
      const response = await axios.get(
        `${BASE_URL}/api/songs?search=${encodeURIComponent(hymnTitle)}&limit=5`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      
      const songs = response.data.songs || [];
      
      if (songs && songs.length > 0) {
        // Navigate directly to the song by ID
        navigate(`/hymn/${songs[0].title}`);
      } else {
        showToast(`"${hymnTitle}" not found in hymn book`);
        setOpeningSong(null);
      }
    } catch (err) {
      console.error("Error finding hymn:", err);
      showToast(`Could not find "${hymnTitle}"`);
      setOpeningSong(null);
    }
  };

  // Fetch programs
  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/mass-programs`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      const programsData = Array.isArray(res.data) ? res.data : [];
      setPrograms(programsData);
      
      const now = new Date();
      const upcoming = programsData.filter(p => new Date(p.date) >= now).length;
      const venues = [...new Set(programsData.map(p => p.venue).filter(Boolean))].length;
      
      // Calculate total hymns (counting multiple songs per field)
      let hymnCount = 0;
      programsData.forEach(p => {
        songFields.forEach(f => {
          const songs = parseSongs(p[f.key]);
          hymnCount += songs.length;
        });
      });
      
      setStats({
        total: programsData.length,
        venues,
        upcoming,
        totalHymns: hymnCount,
      });
    } catch (err) {
      console.error(err);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPrograms();
    const savedFavorites = localStorage.getItem("massProgramFavorites");
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    
    const savedNotes = localStorage.getItem("songNotes");
    if (savedNotes) setSongNotes(JSON.parse(savedNotes));
  }, [fetchPrograms]);

  useEffect(() => {
    localStorage.setItem("massProgramFavorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("songNotes", JSON.stringify(songNotes));
  }, [songNotes]);

  // ========== HELPER FUNCTIONS ==========
const generateShareImage = async (program) => {
  const formattedDate = new Date(program.date).toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Create container for the image
  const container = document.createElement('div');
  container.style.cssText = `
    padding: 30px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    max-width: 600px;
    font-family: 'Arial', sans-serif;
    color: white;
  `;
  
  const songsHtml = songFields.map(field => {
    const songsArray = parseSongs(program[field.key]);
    if (songsArray.length === 0) return '';
    
    return `
      <div style="margin-bottom: 12px; background: rgba(255,255,255,0.15); padding: 10px; border-radius: 12px;">
        <div style="font-weight: bold; margin-bottom: 6px; font-size: 14px;">
          ${field.icon} ${field.label}
        </div>
        <div style="font-size: 12px;">
          ${songsArray.map((song, idx) => 
            idx === 0 ? song : `<div style="margin-top: 4px;">${idx + 1}. ${song}</div>`
          ).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 28px;">⛪</div>
      <h1 style="font-size: 24px; margin: 8px 0;">MASS PROGRAM</h1>
      <div style="font-size: 14px;">${formattedDate}</div>
      <div style="font-size: 16px; font-weight: bold; margin-top: 8px;">${program.venue}</div>
    </div>
    ${songsHtml}
    <div style="text-align: center; margin-top: 20px; font-size: 10px; opacity: 0.7;">
      ZUCA SYSTEM GENERATED | ZUCA Portal
    </div>
  `;

  document.body.appendChild(container);
  const canvas = await html2canvas(container, { scale: 2, backgroundColor: null });
  document.body.removeChild(container);
  
  return canvas.toDataURL('image/png');
};


const shareImageToWhatsApp = async (program) => {
  setGeneratingImage(true);
  showToast("Preparing image...");
  
  try {
    // Create the SAME image as your download button
    const formattedDate = new Date(program.date).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const container = document.createElement('div');
    container.style.padding = '20px';
    container.style.background = 'white';
    container.style.borderRadius = '12px';
    container.style.maxWidth = '800px';
    container.style.margin = '0 auto';
    container.style.fontFamily = 'Arial, sans-serif';
    
    const songsHtml = songFields.map(field => {
      const songsArray = parseSongs(program[field.key]);
      if (songsArray.length === 0) return '';
      
      let songsDisplay = '';
      if (songsArray.length === 1) {
        songsDisplay = `<div style="font-size: 13px; line-height: 1.4;">${songsArray[0]}</div>`;
      } else {
        songsDisplay = songsArray.map((song) => 
          `<div style="font-size: 13px; line-height: 1.4; margin-top: ${idx === 0 ? '0' : '6px'};">${idx + 1}. ${song}</div>`
        ).join('');
      }
      
      return `
        <div style="padding: 10px; background: #f8fafc; border-radius: 8px; border-left: 3px solid ${field.color}; margin-bottom: 8px;">
          <div style="font-weight: bold; color: ${field.color}; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; font-size: 13px;">
            <span>${field.icon}</span>
            <span>${field.label}</span>
          </div>
          ${songsDisplay}
        </div>
      `;
    }).filter(html => html).join('');

    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; font-size: 24px; margin: 0;">MASS PROGRAM</h1>
        <div style="color: #64748b; margin-top: 12px; font-size: 14px;">${formattedDate}</div>
        <div style="font-size: 16px; font-weight: bold; color: #2c3e50; margin-top: 5px;">${program.venue}</div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
        ${songsHtml}
      </div>
      <div style="margin-top: 25px; text-align: center; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px;">
        ZUCA SYSTEM GENERATED | ZUCA Portal
      </div>
    `;

    document.body.appendChild(container);
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', logging: false });
    document.body.removeChild(container);

    // Convert canvas to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    
    // Create a temporary URL for the image
    const imageUrl = URL.createObjectURL(blob);
    
    // Download the image first (saves to phone gallery)
    const link = document.createElement('a');
    link.download = `Mass_Program_${program.date}.png`;
    link.href = imageUrl;
    link.click();
    
    showToast("✅ Image saved! Opening WhatsApp...");
    
    // Open WhatsApp to a specific number (blank opens contact list)
    setTimeout(() => {
      window.location.href = "https://wa.me/";
    }, 1000);
    
    setTimeout(() => {
      showToast("Tap + → Gallery → Select Mass Program image");
    }, 3000);
    
    URL.revokeObjectURL(imageUrl);
    
  } catch (error) {
    console.error(error);
    showToast("Failed to create image");
  } finally {
    setGeneratingImage(false);
  }
};

  const getSongFrequency = (key) => {
    let count = 0;
    programs.forEach(p => {
      const songs = parseSongs(p[key]);
      count += songs.length;
    });
    return count;
  };

  const getUniqueSongs = (key) => {
    const songs = new Set();
    programs.forEach(p => {
      const songsArray = parseSongs(p[key]);
      songsArray.forEach(s => songs.add(s));
    });
    return Array.from(songs);
  };

  const addSongNote = (programId, songKey, songIndex, currentNote) => {
    const noteKey = songIndex !== undefined ? `${programId}-${songKey}-${songIndex}` : `${programId}-${songKey}`;
    const note = prompt('Add a note for this hymn:', currentNote || '');
    if (note !== null) {
      if (note.trim() !== '') {
        setSongNotes(prev => ({
          ...prev,
          [noteKey]: note
        }));
        showToast('📝 Note added');
      } else {
        const newNotes = { ...songNotes };
        delete newNotes[noteKey];
        setSongNotes(newNotes);
        showToast('📝 Note removed');
      }
    }
  };

  const highlightSong = (programId, songKey) => {
    setHighlightedSong(`${programId}-${songKey}`);
    setTimeout(() => setHighlightedSong(null), 2000);
  };

  const previewSong = (songTitle) => {
    setSongPreview(songTitle);
    setTimeout(() => setSongPreview(null), 3000);
  };

  // ========== GET SONGS ARRAY FROM PROGRAM ==========
  const getSongsArray = (program, fieldKey) => {
    const value = program[fieldKey];
    return parseSongs(value);
  };

  // ========== IMAGE DOWNLOAD ==========
  const downloadAsImage = async (program) => {
    setGeneratingImage(true);
    showToast("Generating image...");

    try {
      const formattedDate = new Date(program.date).toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const songsHtml = songFields.map(field => {
        const songsArray = getSongsArray(program, field.key);
        if (songsArray.length === 0) return '';
        
        let songsDisplay = '';
        if (songsArray.length === 1) {
          songsDisplay = `<div style="font-size: 13px; line-height: 1.4;">${songsArray[0]}</div>`;
        } else {
          songsDisplay = songsArray.map((song, idx) => 
            `<div style="font-size: 13px; line-height: 1.4; margin-top: ${idx === 0 ? '0' : '6px'};">${idx + 1}. ${song}</div>`
          ).join('');
        }
        
        return `
          <div style="padding: 10px; background: #f8fafc; border-radius: 8px; border-left: 3px solid ${field.color}; margin-bottom: 8px; break-inside: avoid;">
            <div style="font-weight: bold; color: ${field.color}; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; font-size: 13px;">
              <span>${field.icon}</span>
              <span>${field.label}</span>
            </div>
            ${songsDisplay}
          </div>
        `;
      }).filter(html => html).join('');

      const container = document.createElement('div');
      container.style.padding = '20px';
      container.style.background = 'white';
      container.style.borderRadius = '12px';
      container.style.maxWidth = '800px';
      container.style.margin = '0 auto';
      container.style.fontFamily = 'Arial, sans-serif';
      
      container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; font-size: 24px; margin: 0;">MASS PROGRAM</h1>
          <div style="color: #64748b; margin-top: 12px; font-size: 14px;">${formattedDate}</div>
          <div style="font-size: 16px; font-weight: bold; color: #2c3e50; margin-top: 5px;">${program.venue}</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          ${songsHtml}
        </div>
        <div style="margin-top: 25px; text-align: center; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px;">
          ZUCA SYSTEM GENERATED | ZUCA PORTAL
        </div>
      `;

      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', logging: false });
      document.body.removeChild(container);

      const link = document.createElement('a');
      link.download = `Mass_Program_${program.date}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast("Image downloaded successfully");
    } catch (error) {
      console.error(error);
      showToast("Failed to generate image");
    } finally {
      setGeneratingImage(false);
    }
  };

  // ========== WORD DOCUMENT DOWNLOAD ==========
  const downloadAsWord = (program) => {
    const formattedDate = new Date(program.date).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const songsRows = songFields.map(field => {
      const songsArray = getSongsArray(program, field.key);
      if (songsArray.length === 0) return '';
      
      let songsDisplay = '';
      if (songsArray.length === 1) {
        songsDisplay = songsArray[0];
      } else {
        songsDisplay = songsArray.map((song, idx) => `${idx + 1}. ${song}`).join('<br>');
      }
      
      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-weight: 600; color: #2c3e50; width: 30%; background: #f8fafc;">${field.icon} ${field.label}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; line-height: 1.4;">${songsDisplay}</td>
        </tr>
      `;
    }).filter(html => html).join('');

    const content = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Mass Program - ${program.date}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Calibri', 'Arial', sans-serif; max-width: 1000px; margin: 0 auto; padding: 40px 20px; background: white; }
        @media print { body { padding: 0; margin: 0; } }
        h1 { color: #2c3e50; text-align: center; border-bottom: 3px solid #3498db; padding-bottom: 15px; margin-bottom: 20px; font-size: 28px; }
        .header { text-align: center; margin-bottom: 30px; }
        .date { color: #7f8c8d; font-size: 16px; margin: 10px 0; }
        .venue { font-size: 20px; font-weight: bold; color: #2c3e50; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 30px; }
        .footer { margin-top: 40px; text-align: center; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div>
        <div class="header">
          <h1>⛪ MASS PROGRAM</h1>
          <div class="date">📅 ${formattedDate}</div>
          <div class="venue">📍 ${program.venue}</div>
        </div>
        <table>
          <tbody>${songsRows}</tbody>
        </table>
        <div class="footer">
          ZUCA SYSTEM GENERATED | ZUCA PORTAL 🙏
        </div>
      </div>
    </body>
    </html>`;

    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mass_Program_${program.date}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Word document downloaded");
  };

  // ========== PDF DOWNLOAD ==========
  const downloadAsPDF = (program) => {
    const formattedDate = new Date(program.date).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const songsRows = songFields.map(field => {
      const songsArray = getSongsArray(program, field.key);
      if (songsArray.length === 0) return '';
      
      let songsDisplay = '';
      if (songsArray.length === 1) {
        songsDisplay = songsArray[0];
      } else {
        songsDisplay = songsArray.map((song, idx) => `${idx + 1}. ${song}`).join('<br>');
      }
      
      return `
        <div class="song-row">
          <div class="song-label">${field.icon} ${field.label}</div>
          <div class="song-value">${songsDisplay}</div>
        </div>
      `;
    }).filter(html => html).join('');

    const content = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Mass Program - ${program.date}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; background: white; }
        @media print { body { padding: 0; margin: 0; } }
        h1 { color: #1a1a2e; text-align: center; border-bottom: 2px solid #1a1a2e; padding-bottom: 12px; margin-bottom: 20px; font-size: 26px; }
        .header { text-align: center; margin-bottom: 35px; }
        .date { color: #333; font-size: 14px; margin: 8px 0; }
        .venue { font-size: 18px; font-weight: bold; margin-top: 5px; }
        .song-row { display: flex; margin: 10px 0; padding: 8px; border-bottom: 1px solid #ddd; break-inside: avoid; }
        .song-label { font-weight: bold; width: 200px; flex-shrink: 0; }
        .song-value { flex: 1; line-height: 1.4; }
        .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div>
        <div class="header">
          <h1>MASS PROGRAM</h1>
          <div class="date">${formattedDate}</div>
          <div class="venue">${program.venue}</div>
        </div>
        ${songsRows}
        <div class="footer">
          ZUCA SYSTEM GENERATED | ZUCA PORTAL 🙏
        </div>
      </div>
    </body>
    </html>`;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mass_Program_${program.date}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("HTML saved - use Ctrl+P to save as PDF");
  };

 // ========== GENERATE SHARE LINK ==========
const generateShareLink = (program) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/mass-programs?program=${program.id}`;
};

// ========== SHARE LINK TO PLATFORMS ==========
const shareLink = (program, platform) => {
  const link = generateShareLink(program);
  const formattedDate = new Date(program.date).toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const message = `📋 Mass Program\n📅 ${formattedDate}\n📍 ${program.venue}\n\nView full program: ${link}`;
  
  if (platform === 'whatsapp') {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  } else if (platform === 'telegram') {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Mass Program - ${formattedDate}`)}`, '_blank');
  } else if (platform === 'twitter') {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Mass Program ${formattedDate}`)}&url=${encodeURIComponent(link)}`, '_blank');
  } else if (platform === 'facebook') {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
  } else if (platform === 'email') {
    window.open(`mailto:?subject=Mass Program - ${formattedDate}&body=${encodeURIComponent(message)}`, '_blank');
  } else {
    navigator.clipboard.writeText(link);
    showToast('🔗 Link copied to clipboard!');
  }
};

// ========== COPY LINK ==========
const copyLink = (program) => {
  const link = generateShareLink(program);
  navigator.clipboard.writeText(link);
  showToast('🔗 Link copied to clipboard!');
};

  const copyToClipboard = (program) => {
    const formattedDate = new Date(program.date).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let shareText = `MASS PROGRAM\n📅 ${formattedDate}\n📍 ${program.venue}\n\n`;
    
    songFields.forEach(field => {
      const songsArray = getSongsArray(program, field.key);
      if (songsArray.length > 0) {
        shareText += `${field.icon} ${field.label}: `;
        if (songsArray.length === 1) {
          shareText += `${songsArray[0]}\n`;
        } else {
          shareText += songsArray.map((s, i) => `\n  ${i+1}. ${s}`).join('') + '\n';
        }
      }
    });
    
    shareText += `\nZetech Catholic Action | ZUCA Portal`;
    
    navigator.clipboard.writeText(shareText);
    showToast("📋 Mass program copied to clipboard!");
  };

  const printProgram = (program) => {
    const formattedDate = new Date(program.date).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const songsRows = songFields.map(field => {
      const songsArray = getSongsArray(program, field.key);
      if (songsArray.length === 0) return '';
      
      let songsDisplay = '';
      if (songsArray.length === 1) {
        songsDisplay = songsArray[0];
      } else {
        songsDisplay = songsArray.map((song, idx) => `${idx + 1}. ${song}`).join('<br>');
      }
      
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; vertical-align: top; font-weight: bold; width: 200px;">${field.icon} ${field.label}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; vertical-align: top;">${songsDisplay}</td>
        </tr>
      `;
    }).filter(html => html).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mass Program - ${program.date}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; padding: 40px 20px; max-width: 900px; margin: 0 auto; }
          h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .date { color: #333; margin: 8px 0; }
          .venue { font-size: 18px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .footer { margin-top: 40px; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; font-size: 11px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MASS PROGRAM</h1>
          <div class="date">${formattedDate}</div>
          <div class="venue">${program.venue}</div>
        </div>
        <table>
          ${songsRows}
        </table>
        <div class="footer">
          ZUCA SYSTEM GENERATED | ZUCA PORTAL 🙏
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    showToast('🖨️ Print dialog opened');
  };

  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = toastStyle;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleCollapse = (id) => {
    setCollapsedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleFavorite = (id) => {
    const newFavorites = favorites.includes(id) 
      ? favorites.filter(x => x !== id)
      : [...new Set([...favorites, id])];
    setFavorites(newFavorites);
    showToast(newFavorites.includes(id) ? "❤️ Added to favorites" : "❤️ Removed from favorites");
  };

  // Filter programs
  const filteredPrograms = useMemo(() => {
    let filtered = [...programs];

    if (searchTerm) {
      filtered = filtered.filter(p => 
        songFields.some(f => {
          const songs = parseSongs(p[f.key]);
          return songs.some(song => song?.toLowerCase().includes(searchTerm.toLowerCase()));
        }) ||
        p.venue.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedVenue !== "all") {
      filtered = filtered.filter(p => p.venue === selectedVenue);
    }

    if (showFavoritesOnly) {
      filtered = filtered.filter(p => favorites.includes(p.id));
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [programs, searchTerm, selectedVenue, showFavoritesOnly, favorites, sortOrder]);

  const venues = useMemo(() => {
    return ["all", ...new Set(programs.map(p => p.venue))];
  }, [programs]);

  const handleDownloadClick = (p, type) => {
    if (type === 'word') downloadAsWord(p);
    else if (type === 'pdf') downloadAsPDF(p);
    else if (type === 'image') downloadAsImage(p);
    setShowDownloadMenu(null);
  };

  if (loading) {
    return (
      <div style={loadingContainer}>
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={loadingSpinner}
        >
          {logo ? <img src={logo} alt="Loading..." style={{ width: 40, height: 60 }} /> : <FaChurch size={60} />}
        </motion.div>
        <p style={loadingText}>Preparing the liturgy...</p>
        <p style={loadingSubtext}>Loading hymns and programs</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={container}
    >
      {/* Header */}
      <div style={headerSection}>
        <div style={headerTop}>
          <div style={titleWrapper}>
            <div style={titleIcon}>{logo ? <img src={logo} alt="Logo" style={{ width: 40, height: 50 }} /> : <FaChurch size={40} />}</div>
            <div>
              <h1 style={title}>Mass Programs</h1>
              <p style={titleSub}>{stats.totalHymns} hymns • {stats.venues} venues</p>
            </div>
          </div>
        </div>

        {/* Compact Stats */}
        <div style={compactStats}>
          <motion.div 
            style={compactStat}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFavoritesOnly(false)}
          >
            <span style={compactStatValue}>{stats.total}</span>
            <span style={compactStatLabel}>Programs</span>
          </motion.div>
          <motion.div 
            style={compactStat}
            whileTap={{ scale: 0.95 }}
          >
            <span style={compactStatValue}>{stats.upcoming}</span>
            <span style={compactStatLabel}>Upcoming</span>
          </motion.div>
          <motion.div 
            style={compactStat}
            whileTap={{ scale: 0.95 }}
          >
            <span style={compactStatValue}>{stats.venues}</span>
            <span style={compactStatLabel}>Venues</span>
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
        </div>

        {/* Search */}
        <div style={searchContainer}>
          <FiSearch style={searchIcon} />
          <input
            type="text"
            placeholder="Search hymns or venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInput}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={searchClear}>✕</button>
          )}
        </div>

        {/* Filters Row */}
        <div style={filtersRow}>
          <select
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
            style={filterSelect}
          >
            {venues.map(v => (
              <option key={v} value={v}>
                {v === "all" ? "All Venues" : v.length > 20 ? v.substring(0, 20) + '...' : v}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            style={sortButton}
          >
            <FiClock />
            {sortOrder === "desc" ? "Newest" : "Oldest"}
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
            style={sortButton}
          >
            <FiEye />
            {viewMode === 'compact' ? 'Detailed' : 'Compact'}
          </button>
        </div>

        {/* Results Count */}
        <div style={resultsCount}>
          <span style={resultsBold}>{filteredPrograms.length}</span> programs • 
          <span style={resultsBold}> {
            filteredPrograms.reduce((acc, p) => {
              return acc + songFields.reduce((sum, f) => sum + parseSongs(p[f.key]).length, 0);
            }, 0)
          }</span> hymns
        </div>
      </div>

      {/* Programs List */}
      <div style={programsList}>
        <AnimatePresence>
          {filteredPrograms.map((p) => {
            const isExpanded = expandedIds.includes(p.id);
            const isCollapsed = collapsedIds.includes(p.id);
            const isFavorite = favorites.includes(p.id);
            const displayFields = isMobile && !isExpanded ? mobileCompactFields : songFields;
            const hasTime = p.time && p.time !== 'To be announced';

            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{
                  ...programCard,
                  borderLeft: isFavorite ? '4px solid #ec4899' : 'none',
                }}
              >
                {/* Card Header */}
                <div style={cardHeader} onClick={() => toggleCollapse(p.id)}>
                  <div style={cardHeaderLeft}>
                    <div style={dateBadge}>
                      <span style={dateDay}>{new Date(p.date).getDate()}</span>
                      <span style={dateMonth}>
                        {new Date(p.date).toLocaleString('default', { month: 'short' })}
                      </span>
                    </div>
                    <div style={cardInfo}>
                      <div style={cardTitleRow}>
                        <span style={cardDate}>{formatDate(p.date)}</span>
                        {new Date(p.date).toDateString() === new Date().toDateString() && (
                          <span style={todayChip}>Today</span>
                        )}
                      </div>
                      <div style={cardVenue}>
                        <FiMapPin size={12} />
                        <span>{p.venue.length > 25 ? p.venue.substring(0, 25) + '...' : p.venue}</span>
                      </div>
                      {hasTime && (
                        <div style={{ ...cardVenue, marginTop: '2px' }}>
                          <FiClock size={12} />
                          <span>{p.time}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={cardHeaderRight}>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                      style={iconButton}
                    >
                      <FiHeart style={{ color: isFavorite ? "#ec4899" : "#94a3b8", fill: isFavorite ? "#ec4899" : "none" }} />
                    </motion.button>
                    <motion.div whileTap={{ scale: 0.9 }} style={chevronIcon}>
                      {isCollapsed ? <FiChevronDown /> : <FiChevronUp />}
                    </motion.div>
                  </div>
                </div>

                {/* Songs Grid - WITH MULTIPLE SONG SUPPORT */}
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={songsGrid}
                  >
                    {displayFields.map((f) => {
                      const songsArray = parseSongs(p[f.key]);
                      if (songsArray.length === 0) return null;
                      
                      const frequency = getSongFrequency(f.key);
                      const uniqueSongs = getUniqueSongs(f.key).length;

                      return songsArray.map((song, idx) => {
                        const songKey = `${p.id}-${f.key}-${idx}`;
                        const isHighlighted = highlightedSong === songKey;
                        const note = songNotes[songKey] || songNotes[`${p.id}-${f.key}`];
                        const displayLabel = idx === 0 ? f.label : `${f.label} ${idx + 1}`;
                        const isOpening = openingSong === song;
                        
                        return (
                          <motion.div
                            key={`${f.key}-${idx}`}
                            style={{
                              ...songItem,
                              borderLeft: `4px solid ${f.color}`,
                              backgroundColor: isHighlighted ? f.color + '15' : '#f8fafc',
                              transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                              position: 'relative',
                            }}
                            whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          >
                            {/* Loading Overlay */}
                            {isOpening && (
                              <div style={songLoadingOverlay}>
                                <div style={songLoadingSpinner}></div>
                                <span style={songLoadingText}>Opening lyrics...</span>
                              </div>
                            )}
                            
                            <div style={songHeader}>
                              <div style={{ ...songIcon, color: f.color }}>{f.icon}</div>
                              <div style={songLabel}>{displayLabel}</div>
                              {viewMode === 'detailed' && idx === 0 && (
                                <div style={songMeta}>
                                  <span style={songMetaItem} title={'Used in ' + frequency + ' programs'}>
                                    <FiEye size={10} /> {frequency}
                                  </span>
                                  <span style={songMetaItem} title={uniqueSongs + ' unique songs'}>
                                    <BsMusicNoteList size={10} /> {uniqueSongs}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div style={songValueWrapper}>
                              <div 
                                style={{
                                  ...clickableSongValue,
                                  cursor: isOpening ? 'wait' : 'pointer',
                                  opacity: isOpening ? 0.7 : 1,
                                }}
                                onClick={(e) => !isOpening && navigateToHymn(song, e)}
                                title="Click to view lyrics in hymn book"
                              >
                                {song}
                                <span style={viewIconStyle}>👁️</span>
                              </div>
                              {viewMode === 'detailed' && idx === 0 && f.description && (
                                <div style={songDescription}>{f.description}</div>
                              )}
                            </div>

                            <div style={songActions}>
                              <motion.span
                                whileHover={{ scale: 1.2 }}
                                style={songActionIcon}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  previewSong(song);
                                }}
                                title="Preview song"
                              >
                                <BsPlayCircle size={14} color={f.color} />
                              </motion.span>
                              <motion.span
                                whileHover={{ scale: 1.2 }}
                                style={songActionIcon}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addSongNote(p.id, f.key, idx, note);
                                }}
                                title="Add note"
                              >
                                <FaRegKeyboard size={12} color={note ? "#8b5cf6" : "#6b7280"} />
                              </motion.span>
                              <motion.span
                                whileHover={{ scale: 1.2 }}
                                style={songActionIcon}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(song);
                                  highlightSong(p.id, `${f.key}-${idx}`);
                                  showToast('📋 Copied: ' + song.substring(0, 30) + '...');
                                }}
                                title="Copy to clipboard"
                              >
                                <FiCopy size={12} color="#6b7280" />
                              </motion.span>
                            </div>

                            {note && (
                              <div style={songNote}>
                                <MdOutlineFormatQuote size={10} />
                                {note}
                              </div>
                            )}
                          </motion.div>
                        );
                      });
                    })}

                    {/* Mobile Expand Button */}
                    {isMobile && !isExpanded && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleExpand(p.id)}
                        style={expandMoreButton}
                      >
                        + {songFields.length - mobileCompactFields.length} more sections
                      </motion.button>
                    )}
                  </motion.div>
                )}

                {/* Action Buttons */}
                {!isCollapsed && (
                 <div style={actionButtons}>
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={() => copyLink(p)}
    style={actionButton}
  >
    <FiCopy size={14} />
    <span>Copy Link</span>
  </motion.button>
  
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={() => shareLink(p, 'whatsapp')}
    style={{ ...actionButton, background: "#25D366", color: "white" }}
  >
    <BsWhatsapp size={14} />
    <span>WhatsApp</span>
  </motion.button>

  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={() => setShareModal(p)}
    style={actionButton}
  >
    <FiShare2 size={14} />
    <span>Share</span>
  </motion.button>

  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={() => printProgram(p)}
    style={{ ...actionButton, background: "#10b981", color: "white" }}
  >
    <FiPrinter size={14} />
    <span>Print</span>
  </motion.button>

  <div style={downloadDropdownContainer} ref={downloadMenuRef}>
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => setShowDownloadMenu(showDownloadMenu === p.id ? null : p.id)}
      style={{
        ...actionButton,
        background: showDownloadMenu === p.id ? '#4f46e5' : '#f8fafc',
        color: showDownloadMenu === p.id ? 'white' : '#475569',
        gridColumn: 'span 4',
      }}
    >
      <FiDownload size={14} />
      <span>Save as...</span>
      <FiChevronDown size={10} style={{ marginLeft: '2px' }} />
    </motion.button>
    
    <AnimatePresence>
      {showDownloadMenu === p.id && (
        <motion.div 
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          style={downloadMenu}
        >
          <button onClick={() => handleDownloadClick(p, 'word')}>
            <FaFileWord /> Word Document (.doc)
          </button>
          <button onClick={() => handleDownloadClick(p, 'pdf')}>
            <FaFilePdf /> PDF Document
          </button>
          <button onClick={() => handleDownloadClick(p, 'image')} disabled={generatingImage}>
            <BsFileImage /> Image (.png)
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
</div>                       
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Song Preview Toast */}
      <AnimatePresence>
        {songPreview && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={previewToast}
          >
            <BsMusicNoteBeamed size={16} color="#4f46e5" />
            <span style={previewText}>Previewing: {songPreview}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
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
      <h3 style={modalTitle}>🔗 Share Mass Program Link</h3>
      
      <div style={linkDisplayContainer}>
        <input 
          type="text" 
          value={generateShareLink(shareModal)} 
          readOnly 
          style={linkInput}
          onClick={() => copyLink(shareModal)}
        />
        <button onClick={() => copyLink(shareModal)} style={copyLinkButton}>
          <FiCopy size={16} />
        </button>
      </div>
      
      <div style={modalOptions}>
        <button onClick={() => shareLink(shareModal, 'whatsapp')} style={modalOption}>
          <BsWhatsapp size={24} color="#25D366" />
          <span>WhatsApp</span>
        </button>
        
        <button onClick={() => shareLink(shareModal, 'telegram')} style={modalOption}>
          <FaTelegramPlane size={24} color="#0088cc" />
          <span>Telegram</span>
        </button>
        
        <button onClick={() => shareLink(shareModal, 'twitter')} style={modalOption}>
          <BsTwitter size={24} color="#1DA1F2" />
          <span>Twitter</span>
        </button>
        
        <button onClick={() => shareLink(shareModal, 'facebook')} style={modalOption}>
          <FaFacebook size={24} color="#1877F2" />
          <span>Facebook</span>
        </button>
        
        <button onClick={() => shareLink(shareModal, 'email')} style={modalOption}>
          <FiMail size={24} color="#EA4335" />
          <span>Email</span>
        </button>
        
        <button onClick={() => shareLink(shareModal, 'copy')} style={modalOption}>
          <FiCopy size={24} color="#4f46e5" />
          <span>Copy Link</span>
        </button>
      </div>

      <button onClick={() => setShareModal(null)} style={modalClose}>
        Close
      </button>
    </motion.div>
  </motion.div>
)}
      </AnimatePresence>

      <style>
        {`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </motion.div>
  );
}

// ====== STYLES ======
const container = {
  padding: "12px",
  maxWidth: "100%",
  fontFamily: "'Inter', -apple-system, sans-serif",
  background: "#f8fafc",
  minHeight: "100vh",
  marginBottom: "40px",
  borderRadius: "25px",
};

const loadingContainer = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#f8fafc",
  borderRadius: "40px",
};

const loadingSpinner = {
  width: "60px",
  height: "60px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "30px",
  background: "#ffffff",
  borderRadius: "50%",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  marginBottom: "16px",
};

const loadingText = {
  color: "#1e293b",
  fontSize: "16px",
  fontWeight: "600",
  marginBottom: "4px",
};

const loadingSubtext = {
  color: "#64748b",
  fontSize: "12px",
};

// Song loading overlay
const songLoadingOverlay = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(255,255,255,0.9)",
  borderRadius: "12px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
  gap: "8px",
};

const songLoadingSpinner = {
  width: "24px",
  height: "24px",
  border: "2px solid #e2e8f0",
  borderTopColor: "#4f46e5",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const songLoadingText = {
  fontSize: "11px",
  color: "#4f46e5",
  fontWeight: "500",
};

const headerSection = { marginBottom: "16px" };
const headerTop = { marginBottom: "12px" };
const titleWrapper = { display: "flex", alignItems: "center", gap: "8px" };
const titleIcon = { width: "44px", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", color: "#ffffff" };
const title = { fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: 0 };
const titleSub = { fontSize: "12px", color: "#64748b", margin: 0 };
const compactStats = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "12px" };
const compactStat = { background: "#ffffff", padding: "10px 4px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", cursor: "pointer" };
const compactStatValue = { fontSize: "18px", fontWeight: "700", color: "#0f172a" };
const compactStatLabel = { fontSize: "10px", color: "#64748b", textTransform: "uppercase" };
const searchContainer = { position: "relative", marginBottom: "12px" };
const searchIcon = { position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "14px" };
const searchInput = { width: "100%", padding: "12px 12px 12px 40px", borderRadius: "30px", border: "1px solid #e2e8f0", background: "#ffffff", fontSize: "14px", outline: "none" };
const searchClear = { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", fontSize: "16px", cursor: "pointer", padding: "4px 8px" };
const filtersRow = { display: "grid", gridTemplateColumns: "1fr auto auto", gap: "6px", marginBottom: "8px" };
const filterSelect = { padding: "8px 10px", borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", fontSize: "12px", color: "#0f172a", outline: "none" };
const sortButton = { display: "flex", alignItems: "center", gap: "4px", padding: "8px 12px", borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", fontSize: "12px", color: "#0f172a", cursor: "pointer", whiteSpace: "nowrap" };
const resultsCount = { fontSize: "12px", color: "#64748b", marginBottom: "12px" };
const resultsBold = { fontWeight: "700", color: "#0f172a", margin: "0 2px" };
const programsList = { display: "flex", flexDirection: "column", gap: "12px" };
const programCard = { background: "#ffffff", borderRadius: "16px", padding: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", position: "relative" };
const cardHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", cursor: "pointer" };
const cardHeaderLeft = { display: "flex", gap: "10px", flex: 1 };
const dateBadge = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", borderRadius: "12px", color: "#ffffff" };
const dateDay = { fontSize: "18px", fontWeight: "700", lineHeight: 1 };
const dateMonth = { fontSize: "10px", textTransform: "uppercase" };
const cardInfo = { flex: 1 };
const cardTitleRow = { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" };
const cardDate = { fontSize: "15px", fontWeight: "600", color: "#0f172a" };
const todayChip = { fontSize: "9px", padding: "2px 6px", background: "#10b981", borderRadius: "12px", color: "#ffffff", fontWeight: "600" };
const cardVenue = { display: "flex", alignItems: "center", gap: "4px", color: "#64748b", fontSize: "11px", marginTop: "2px" };
const cardHeaderRight = { display: "flex", alignItems: "center", gap: "6px" };
const iconButton = { background: "none", border: "none", padding: "6px", cursor: "pointer", fontSize: "16px", display: "flex" };
const chevronIcon = { color: "#94a3b8", fontSize: "16px", padding: "6px" };
const songsGrid = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginTop: "10px", marginBottom: "10px" };
const songItem = { background: "#f8fafc", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0", transition: "all 0.2s", position: "relative" };
const songHeader = { display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", flexWrap: "wrap" };
const songIcon = { fontSize: "16px" };
const songLabel = { fontSize: "11px", fontWeight: "600", color: "#475569" };
const songMeta = { display: "flex", gap: "4px", marginLeft: "auto" };
const songMetaItem = { fontSize: "8px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "2px" };
const songValueWrapper = { marginBottom: "4px" };
const clickableSongValue = { fontSize: "12px", fontWeight: "600", color: "#4f46e5", wordBreak: "break-word", lineHeight: 1.4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", transition: "all 0.2s" };
const viewIconStyle = { fontSize: "10px", opacity: 0.5, transition: "opacity 0.2s" };
const songDescription = { fontSize: "9px", color: "#64748b", marginTop: "2px", fontStyle: "italic" };
const songActions = { display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "4px" };
const songActionIcon = { cursor: "pointer", padding: "2px" };
const songNote = { fontSize: "9px", color: "#8b5cf6", marginTop: "4px", padding: "2px 4px", background: "#ede9fe", borderRadius: "4px", display: "flex", alignItems: "center", gap: "2px" };
const expandMoreButton = { gridColumn: "span 2", padding: "10px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", fontSize: "11px", fontWeight: "500", color: "#4f46e5", cursor: "pointer", marginTop: "4px" };
const actionButtons = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px", marginTop: "10px", position: "relative" };
const actionButton = { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "8px 2px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "9px", fontWeight: "500", color: "#475569", cursor: "pointer", width: "100%", transition: "all 0.2s" };
const downloadDropdownContainer = { position: "relative", gridColumn: "span 4", marginTop: "7px" };
const downloadMenu = { position: "absolute", bottom: "100%", left: 0, right: 0, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "8px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)", zIndex: 20, marginBottom: "8px", display: "flex", flexDirection: "column", gap: "8px" };
const previewToast = { position: "fixed", bottom: "80px", left: "50%", transform: "translateX(-50%)", background: "#ffffff", color: "#0f172a", padding: "10px 20px", borderRadius: "30px", fontSize: "13px", fontWeight: "500", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)", zIndex: 9998, display: "flex", alignItems: "center", gap: "8px", border: "1px solid #e2e8f0" };
const previewText = { maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 1000 };
const modalContent = { background: "#ffffff", borderRadius: "24px", padding: "24px", maxWidth: "400px", width: "100%", maxHeight: "80vh", overflowY: "auto" };
const modalTitle = { fontSize: "18px", fontWeight: "700", color: "#0f172a", marginBottom: "20px", textAlign: "center" };
const modalOptions = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "20px" };
const modalOption = { display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", cursor: "pointer", fontSize: "12px", color: "#0f172a" };

const linkDisplayContainer = {
  display: 'flex',
  gap: '8px',
  marginBottom: '20px',
  alignItems: 'center',
};

const linkInput = {
  flex: 1,
  padding: '10px 12px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  fontSize: '12px',
  color: '#0f172a',
  background: '#f8fafc',
  outline: 'none',
  cursor: 'pointer',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const copyLinkButton = {
  padding: '10px 14px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#4f46e5',
  transition: 'all 0.2s',
};
const modalClose = { width: "100%", padding: "14px", background: "#4f46e5", border: "none", borderRadius: "14px", color: "#ffffff", fontSize: "14px", fontWeight: "600", cursor: "pointer" };
const toastStyle = `position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #0f172a; color: white; padding: 12px 24px; border-radius: 30px; font-size: 14px; font-weight: 500; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); z-index: 9999; animation: slideIn 0.3s ease; white-space: nowrap; max-width: 90%; overflow: hidden; text-overflow: ellipsis;`;