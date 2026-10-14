import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiPlus, FiX, FiEdit2, FiTrash2, FiCalendar,
  FiMapPin, FiMusic, FiBook, FiHeart,
  FiChevronDown, FiChevronUp, FiRefreshCw,
  FiAlertCircle, FiSearch, FiCheck, FiSave, FiClock,
  FiDownload, FiFileText, FiImage, FiMinus
} from "react-icons/fi";
import { GiChurch } from "react-icons/gi";
import { BsFileWord, BsFilePdf, BsFileImage } from "react-icons/bs";
import html2canvas from "html2canvas";
import axios from "axios";
import io from "socket.io-client";
import backgroundImg from "../../assets/background.png";
import BASE_URL from "../../api";
import BookletModal from "../../components/BookletModal";

// Define fields with maximum songs per title
const songFields = [
  { key: "entrance", label: "Entrance Hymn", icon: "", maxSongs: 3, required: true },
  { key: "mass", label: "Mass Hymn", icon: "", maxSongs: 2, required: true },
  { key: "bible", label: "Bible Reading", icon: "", maxSongs: 2, required: true },
  { key: "offertory", label: "Offertory Hymn", icon: "", maxSongs: 3, required: true },
  { key: "procession", label: "Procession Hymn", icon: "", maxSongs: 2, required: false },
  { key: "mtakatifu", label: "Mtakatifu Hymn", icon: "", maxSongs: 2, required: true },
  { key: "signOfPeace", label: "Sign of Peace", icon: "", maxSongs: 1, required: true },
  { key: "communion", label: "Communion Hymn", icon: "", maxSongs: 3, required: true },
  { key: "thanksgiving", label: "Thanksgiving Hymn", icon: "", maxSongs: 2, required: false },
  { key: "exit", label: "Exit Hymn", icon: "", maxSongs: 2, required: true },
];

// Initialize songs array for each field
const initializeSongs = () => {
  const songs = {};
  songFields.forEach(field => {
    songs[field.key] = [""];
  });
  return songs;
};

// Parse songs from semicolon-separated string
const parseSongsFromString = (value) => {
  if (!value) return [""];
  if (Array.isArray(value)) return value.length ? value : [""];
  if (typeof value === 'string') {
    if (value.includes(';')) {
      const parsed = value.split(';').map(s => s.trim()).filter(s => s);
      return parsed.length ? parsed : [""];
    }
    return value ? [value] : [""];
  }
  return [""];
};

// Check access
const checkAccess = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
    return false;
  }
  if (user.role !== "admin" && user.role !== "choir_moderator") {
    window.location.href = "/dashboard";
    return false;
  }
  return true;
};

export default function SongsPage() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ date: "", venue: "", songs: initializeSongs() });
  const [formError, setFormError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedPrograms, setExpandedPrograms] = useState({});
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVenue, setFilterVenue] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [selectedProgramForBooklet, setSelectedProgramForBooklet] = useState(null);
  
  // Song search states
  const [songSearchResults, setSongSearchResults] = useState({});
  const [searchingFields, setSearchingFields] = useState({});
  const [activeField, setActiveField] = useState(null);

  const programRefs = useRef({});
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [savedDrafts, setSavedDrafts] = useState([]);
const [showDraftsList, setShowDraftsList] = useState(false);

  // Load all saved drafts from localStorage
  const loadSavedDrafts = () => {
    const drafts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === 'programDraft') {
        try {
          const draftData = JSON.parse(localStorage.getItem(key));
          if (draftData && draftData.data) {
            drafts.push({
              key: key,
              timestamp: draftData.timestamp || 0,
              date: draftData.data.date || 'No date',
              venue: draftData.data.venue || 'No venue',
              editingId: draftData.editingId || null
            });
          }
        } catch (err) {
          console.error("Error parsing draft:", err);
        }
      }
    }
    drafts.sort((a, b) => b.timestamp - a.timestamp);
    setSavedDrafts(drafts);
  };

  // Load a specific draft
  const loadSpecificDraft = (draftKey) => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const formData = parsed.data;
      
      if (!formData.songs || Object.keys(formData.songs).length === 0) {
        formData.songs = initializeSongs();
      }
      
      setForm(formData);
      setEditingId(parsed.editingId || null);
      setShowDraftsList(false);
      setIsFormOpen(true);
      setDraftLoaded(true);
      showNotification(`Draft loaded`, "success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Error loading draft:", err);
      showNotification("Failed to load draft", "error");
    }
  };

  // Delete a draft
  const deleteDraft = (draftKey, event) => {
    event.stopPropagation();
    if (window.confirm("Delete this saved draft?")) {
      localStorage.removeItem(draftKey);
      loadSavedDrafts();
      showNotification("Draft deleted", "info");
      if (savedDrafts.length === 1) {
        setShowDraftsList(false);
      }
    }
  };

    // Load saved drafts on component mount
  useEffect(() => {
    loadSavedDrafts();
  }, []);

  // Check access
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role);
    setHasAccess(checkAccess());
  }, []);

  // Load draft
  useEffect(() => {
    const savedDraft = localStorage.getItem('programDraft');
    if (savedDraft && !draftLoaded) {
      try {
        const draft = JSON.parse(savedDraft);
        const draftTime = draft.timestamp || 0;
        const now = Date.now();
        if (now - draftTime < 24 * 60 * 60 * 1000) {
          const loadedForm = draft.data;
          if (!loadedForm.songs || Object.keys(loadedForm.songs).length === 0) {
            loadedForm.songs = initializeSongs();
          }
          setForm(loadedForm);
          setEditingId(draft.editingId || null);
          setDraftLoaded(true);
          showNotification("Draft restored", "info");
        } else {
          localStorage.removeItem('programDraft');
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    const draftTimeout = setTimeout(() => {
      const hasContent = form.date || form.venue || Object.values(form.songs).some(arr => arr.some(s => s));
      if (hasContent) {
        localStorage.setItem('programDraft', JSON.stringify({
          data: form, editingId, timestamp: Date.now()
        }));
      }
    }, 1000);
    return () => clearTimeout(draftTimeout);
  }, [form, editingId]);

  // Socket connection
  useEffect(() => {
    const socket = io(BASE_URL);
    socket.on('connect', () => console.log('Connected'));
    socket.on('program_updated', (program) => {
      setPrograms(prev => prev.map(p => p.id === program.id ? program : p));
    });
    socket.on('program_created', (program) => {
      setPrograms(prev => [program, ...prev]);
    });
    socket.on('program_deleted', (id) => {
      setPrograms(prev => prev.filter(p => p.id !== id));
    });
    return () => socket.disconnect();
  }, []);

  const fetchPrograms = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/admin/mass-programs`, { headers });
      let programsData = res.data;
      if (res.data.programs && Array.isArray(res.data.programs)) {
        programsData = res.data.programs;
      } else if (Array.isArray(res.data)) {
        programsData = res.data;
      } else {
        programsData = [];
      }
      setPrograms(programsData);
    } catch (err) {
      showNotification("Failed to load programs", "error");
      setPrograms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, [token]);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  // Search songs
  const performSearch = async (fieldKey, songIndex, searchText) => {
    const searchId = `${fieldKey}-${songIndex}`;
    
    if (!searchText || searchText.trim().length < 2) {
      showNotification("Please enter at least 2 characters to search", "info");
      return;
    }
    
    setSearchingFields(prev => ({ ...prev, [searchId]: true }));
    
    try {
      const res = await axios.get(`${BASE_URL}/api/songs`, {
        params: {
          search: searchText.trim(),
          limit: 10
        }
      });
      
      const songs = res.data.songs || [];
      
      const results = songs.map(song => ({
        id: song.id,
        title: song.title,
        reference: song.reference || '',
        preview: song.firstLine || ''
      }));
      
      setSongSearchResults(prev => ({ ...prev, [searchId]: results }));
      setActiveField(searchId);
      
      if (results.length === 0) {
        showNotification(`No songs found matching "${searchText}"`, "info");
      }
    } catch (err) {
      console.error("Search error:", err);
      showNotification("Search failed. Please try again.", "error");
    } finally {
      setSearchingFields(prev => ({ ...prev, [searchId]: false }));
    }
  };

  const selectSong = (fieldKey, songIndex, songTitle) => {
    setForm(prev => {
      const updatedSongs = [...prev.songs[fieldKey]];
      updatedSongs[songIndex] = songTitle;
      return {
        ...prev,
        songs: { ...prev.songs, [fieldKey]: updatedSongs }
      };
    });
    
    const searchId = `${fieldKey}-${songIndex}`;
    setSongSearchResults(prev => ({ ...prev, [searchId]: [] }));
    setActiveField(null);
  };

  const handleSongChange = (fieldKey, songIndex, value) => {
    setForm(prev => {
      const updatedSongs = [...prev.songs[fieldKey]];
      updatedSongs[songIndex] = value;
      return {
        ...prev,
        songs: { ...prev.songs, [fieldKey]: updatedSongs }
      };
    });
    
    const searchId = `${fieldKey}-${songIndex}`;
    setSongSearchResults(prev => ({ ...prev, [searchId]: [] }));
    setActiveField(null);
  };

  const addSongSlot = (fieldKey) => {
    const field = songFields.find(f => f.key === fieldKey);
    if (field && form.songs[fieldKey].length < field.maxSongs) {
      setForm(prev => ({
        ...prev,
        songs: { ...prev.songs, [fieldKey]: [...prev.songs[fieldKey], ""] }
      }));
    }
  };

  const removeSongSlot = (fieldKey, songIndex) => {
    setForm(prev => {
      const updatedSongs = prev.songs[fieldKey].filter((_, i) => i !== songIndex);
      return {
        ...prev,
        songs: { ...prev.songs, [fieldKey]: updatedSongs }
      };
    });
  };

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleEdit = (program) => {
    setEditingId(program.id);
    const songs = {};
    songFields.forEach(field => {
      songs[field.key] = parseSongsFromString(program[field.key]);
    });
    setForm({
      date: program.date,
      venue: program.venue,
      songs,
    });
    setIsFormOpen(true);
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ date: "", venue: "", songs: initializeSongs() });
    setFormError("");
    localStorage.removeItem('programDraft');
  };

  const handleCancelProgram = () => {
    setForm({ date: "", venue: "", songs: initializeSongs() });
    setFormError("");
    setEditingId(null);
    setIsFormOpen(false);
    localStorage.removeItem('programDraft');
  };

  const checkForDuplicates = () => {
    if (programs.length === 0) return true;

    const parseDate = (str) => {
      if (!str) return new Date(0);
      const [year, month, day] = str.split("-").map(Number);
      return new Date(year, month - 1, day);
    };

    const sortedPrograms = [...programs]
      .filter(p => p.id !== editingId)
      .sort((a, b) => parseDate(b.date) - parseDate(a.date));

    const lastProgram = sortedPrograms[0];
    if (!lastProgram) return true;

    const doTitlesMatch = (inputTitle, existingTitle) => {
      if (!inputTitle || !existingTitle) return false;
      const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
      const normalizedInput = normalize(inputTitle);
      const normalizedExisting = normalize(existingTitle);
      if (normalizedInput === normalizedExisting) return true;
      if (normalizedExisting.includes(normalizedInput) || normalizedInput.includes(normalizedExisting)) return true;
      const inputWords = normalizedInput.split(/\s+/).filter(w => w.length > 2);
      for (const word of inputWords) {
        if (normalizedExisting.includes(word)) return true;
      }
      return false;
    };

    const duplicateSongs = [];

    for (const field of songFields) {
      const inputSongs = form.songs[field.key];
      const lastSongs = parseSongsFromString(lastProgram[field.key]);
      
      for (const inputSong of inputSongs) {
        if (!inputSong) continue;
        for (const lastSong of lastSongs) {
          if (lastSong && doTitlesMatch(inputSong, lastSong)) {
            duplicateSongs.push(`${field.label}: "${inputSong}"`);
            break;
          }
        }
      }
    }

    if (duplicateSongs.length > 0) {
      const getOrdinal = (n) => {
        if (n > 3 && n < 21) return n + "th";
        switch (n % 10) {
          case 1: return n + "st";
          case 2: return n + "nd";
          case 3: return n + "rd";
          default: return n + "th";
        }
      };

      const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
        const dayNumber = getOrdinal(date.getDate());
        const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
        const year = date.getFullYear();
        return `${dayName} ${dayNumber} ${monthName} ${year}`;
      };
setFormError(`⚠️ I'm sorry 😔 i can't add: ${duplicateSongs.slice(0, 3).join(", ")}. Already sung on ${formatDate(lastProgram.date)}! 😂😂 There are many other songs you can sing, repeating is not an option 🫵🥹`);
return false;
    }
    return true;
  };

  const validateRequiredSongs = () => {
    const missingRequired = [];
    for (const field of songFields) {
      if (field.required) {
        const songs = form.songs[field.key];
        const hasValidSong = songs && songs.some(song => song && song.trim() !== "");
        if (!hasValidSong) {
          missingRequired.push(field.label);
        }
      }
    }
    if (missingRequired.length > 0) {
      setFormError(`Please fill at least one song for: ${missingRequired.join(", ")}`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.date || !form.venue) {
      setFormError("Date and venue are required");
      return;
    }

    if (!validateRequiredSongs()) return;
    if (!checkForDuplicates()) return;

    setIsSaving(true);
    
    // Convert arrays to semicolon-separated strings for backend
    const payload = {
      date: form.date,
      venue: form.venue,
      ...Object.entries(form.songs).reduce((acc, [key, songs]) => {
        const filteredSongs = songs.filter(song => song && song.trim() !== "");
        acc[key] = filteredSongs.length > 0 ? filteredSongs.join('; ') : '';
        return acc;
      }, {})
    };

    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/api/admin/mass-programs/${editingId}`, payload, { headers });
        showNotification("Program updated successfully", "success");
      } else {
        await axios.post(`${BASE_URL}/api/admin/mass-programs`, payload, { headers });
        showNotification("Program created successfully", "success");
      }
      fetchPrograms();
      handleCancel();
      setIsFormOpen(false);
    } catch (err) {
      console.error("Save Error:", err);
      setFormError(err.response?.data?.error || "Failed to save program");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this program?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/admin/mass-programs/${id}`, { headers });
      showNotification("Program deleted", "info");
      fetchPrograms();
    } catch (err) {
      showNotification("Failed to delete program", "error");
    }
  };

  const toggleProgram = (id) => {
    setExpandedPrograms(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getSongsArray = (program, fieldKey) => {
    const value = program[fieldKey];
    if (!value) return [];
    if (typeof value === 'string') {
      if (value.includes(';')) {
        return value.split(';').map(s => s.trim()).filter(s => s);
      }
      return value ? [value] : [];
    }
    return [];
  };

  const downloadAsWord = (program) => {
    const songsRows = songFields.map(field => {
      const songsArray = getSongsArray(program, field.key);
      let songsDisplay = '';
      if (songsArray.length === 0) {
        songsDisplay = '—';
      } else if (songsArray.length === 1) {
        songsDisplay = songsArray[0];
      } else {
        songsDisplay = songsArray.map((song, idx) => `${idx + 1}. ${song}`).join('<br>');
      }
      
      return `
        <tr>
          <td class="song-label">${field.icon} ${field.label}</td>
          <td class="song-value">${songsDisplay}</td>
        </tr>
      `;
    }).join('');

    const content = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Mass Program - ${program.date}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Calibri', 'Arial', sans-serif; max-width: 1000px; margin: 0 auto; padding: 30px 20px; background: white; }
        @media print { body { padding: 0; margin: 0; } }
        h1 { color: #2c3e50; text-align: center; border-bottom: 3px solid #3498db; padding-bottom: 12px; margin-bottom: 20px; font-size: 28px; }
        .header { text-align: center; margin-bottom: 25px; }
        .date { color: #7f8c8d; font-size: 16px; margin: 8px 0; }
        .venue { font-size: 20px; font-weight: bold; color: #2c3e50; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #3498db; color: white; padding: 12px; text-align: left; font-size: 15px; }
        td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .song-label { font-weight: 700; color: #2c3e50; width: 30%; background: #f8fafc; }
        .song-value { line-height: 1.4; width: 70%; }
        .footer { margin-top: 30px; text-align: center; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div>
        <div class="header">
          <h1>⛪ MASS PROGRAM</h1>
          <div class="date">📅 ${formatDate(program.date)}</div>
          <div class="venue">📍 ${program.venue}</div>
        </div>
        <table>
          <thead><tr><th>Liturgy Part</th><th>Song / Reading</th></tr></thead>
          <tbody>${songsRows}</tbody>
        </table>
        <div class="footer">
          ZUCA SYSTEM GENERATED | ZUCA PORTAL🙏
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
    showNotification("Word document downloaded", "success");
  };

  const downloadAsPDF = (program) => {
    const songsRows = songFields.map(field => {
      const songsArray = getSongsArray(program, field.key);
      let songsDisplay = '';
      if (songsArray.length === 0) {
        songsDisplay = '—';
      } else if (songsArray.length === 1) {
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
    }).join('');

    const content = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Mass Program - ${program.date}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; max-width: 900px; margin: 0 auto; padding: 30px 20px; background: white; }
        @media print { body { padding: 0; margin: 0; } }
        h1 { color: #1a1a2e; text-align: center; border-bottom: 2px solid #1a1a2e; padding-bottom: 10px; margin-bottom: 20px; font-size: 26px; }
        .header { text-align: center; margin-bottom: 30px; }
        .date { color: #333; font-size: 14px; margin: 8px 0; }
        .venue { font-size: 18px; font-weight: bold; margin-top: 5px; }
        .song-row { display: flex; margin: 10px 0; padding: 8px; border-bottom: 1px solid #ddd; }
        .song-label { font-weight: bold; width: 200px; flex-shrink: 0; }
        .song-value { flex: 1; line-height: 1.4; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 12px; }
      </style>
    </head>
    <body>
      <div>
        <div class="header">
          <h1>MASS PROGRAM</h1>
          <div class="date">${formatDate(program.date)}</div>
          <div class="venue">${program.venue}</div>
        </div>
        ${songsRows}
        <div class="footer">
          ZUCA SYSTEM GENERATED | ZUCA PORTAL
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
    showNotification("HTML saved - use Ctrl+P to save as PDF", "info");
  };

  const downloadAsImage = async (program) => {
    setGeneratingImage(true);
    showNotification("Generating image...", "info");

    try {
      const songsHtml = songFields.map(field => {
        const songsArray = getSongsArray(program, field.key);
        let songsDisplay = '';
        if (songsArray.length === 0) {
          songsDisplay = '<div style="color: #94a3b8;">—</div>';
        } else if (songsArray.length === 1) {
          songsDisplay = `<div>${songsArray[0]}</div>`;
        } else {
          songsDisplay = songsArray.map((song, idx) => `<div style="margin-top: 3px;">${idx + 1}. ${song}</div>`).join('');
        }
        
        return `
          <div style="padding: 10px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #3498db; margin-bottom: 8px;">
            <div style="font-weight: bold; color: #3498db; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <span>${field.icon}</span>
              <span>${field.label}</span>
            </div>
            <div style="font-size: 12px;">${songsDisplay}</div>
          </div>
        `;
      }).join('');

      const container = document.createElement('div');
      container.style.padding = '20px';
      container.style.background = 'white';
      container.style.borderRadius = '8px';
      container.style.maxWidth = '800px';
      container.style.margin = '0 auto';
      container.style.fontFamily = 'Arial, sans-serif';
      
      container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; font-size: 24px;">MASS PROGRAM</h1>
          <div style="color: #64748b; margin-top: 10px; font-size: 14px;">${formatDate(program.date)}</div>
          <div style="font-size: 16px; font-weight: bold; color: #2c3e50;">${program.venue}</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          ${songsHtml}
        </div>
        <div style="margin-top: 25px; text-align: center; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px;">
          ZUCA SYSTEM GENERATED | ZUCA PORTAL 🙏
        </div>
      `;

      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' });
      document.body.removeChild(container);

      const link = document.createElement('a');
      link.download = `Mass_Program_${program.date}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showNotification("Image downloaded", "success");
    } catch (error) {
      console.error(error);
      showNotification("Failed to generate image", "error");
    } finally {
      setGeneratingImage(false);
    }
  };

  const toggleDropdown = (id) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const venues = ['all', ...new Set(programs.map(p => p.venue).filter(Boolean))];

  const filteredPrograms = programs.filter(p => {
    const matchesSearch = p.venue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         Object.values(p).some(val => 
                           typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    const matchesVenue = filterVenue === 'all' || p.venue === filterVenue;
    return matchesSearch && matchesVenue;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  if (!hasAccess) return null;

  const isAdmin = userRole === "admin";
  const isChoirModerator = userRole === "choir_moderator";
  const canModify = isAdmin || isChoirModerator;

  return (
    <div className="songs-page">
      <div className="background-image" style={{ backgroundImage: `url(${backgroundImg})` }}></div>
      <div className="background-overlay"></div>

      <AnimatePresence>
        {notification.show && (
          <motion.div 
            className={`notification ${notification.type}`}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
          >
            {notification.type === 'success' && <FiCheck />}
            {notification.type === 'error' && <FiAlertCircle />}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="content-wrapper">
        <div className="header">
          <div className="header-left">
            <div className="title-icon"><GiChurch /></div>
            <div>
              <h1 className="page-title">Mass Programs</h1>
              <p className="page-subtitle">
                {isChoirModerator ? "Manage songs and liturgy programs as Choir Moderator" : "Manage songs and liturgy programs"}
              </p>
            </div>
          </div>
          
          <div className="header-actions">
            {isChoirModerator && (
              <div className="role-badge" style={{ background: '#ec489920', color: '#ec4899', border: '1px solid #ec4899', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🎵</span> Choir Moderator
              </div>
            )}
            <button className="btn-icon" onClick={() => fetchPrograms(true)} disabled={refreshing} title="Refresh">
              <FiRefreshCw className={refreshing ? 'spinning' : ''} />
            </button>

              {/* ADD THIS DRAFTS BUTTON */}
  <button className="btn-icon" onClick={() => { loadSavedDrafts(); setShowDraftsList(!showDraftsList); }} title="Saved Drafts" style={{ position: 'relative' }}>
    <FiSave />
    {savedDrafts.length > 0 && (
      <span style={{
        position: 'absolute',
        top: '-5px',
        right: '-5px',
        background: '#ef4444',
        color: 'white',
        fontSize: '10px',
        fontWeight: 'bold',
        padding: '2px 5px',
        borderRadius: '10px',
        minWidth: '18px',
        textAlign: 'center'
      }}>{savedDrafts.length}</span>
    )}
  </button>
            {canModify && (
              <button className="btn-primary" onClick={() => setIsFormOpen(!isFormOpen)}>
                {isFormOpen ? <FiX /> : <FiPlus />}
                <span>{isFormOpen ? 'Close' : 'New Program'}</span>
              </button>
            )}
          </div>
        </div>

        {draftLoaded && (
          <div className="draft-indicator">
            <FiClock />
            <span>Draft restored from previous session</span>
            <button className="draft-clear" onClick={() => {
              localStorage.removeItem('programDraft');
              setForm({ date: "", venue: "", songs: initializeSongs() });
              setEditingId(null);
              setDraftLoaded(false);
              showNotification("Draft cleared", "info");
            }}><FiX /> Clear</button>
          </div>
        )}

        {showDraftsList && (
  <div className="drafts-panel">
    <div className="drafts-header">
      <h3><FiSave /> Saved Drafts</h3>
      <button className="close-drafts" onClick={() => setShowDraftsList(false)}>
        <FiX />
      </button>
    </div>
    
    {savedDrafts.length === 0 ? (
      <div className="no-drafts">
        <p>No saved drafts found</p>
        <small>Drafts are auto-saved when you fill the form</small>
      </div>
    ) : (
      <>
        <div className="drafts-list">
          {savedDrafts.map((draft) => (
            <div key={draft.key} className="draft-item" onClick={() => loadSpecificDraft(draft.key)}>
              <div className="draft-info">
                <div className="draft-title">
                  <FiCalendar /> {draft.date || 'No date'}
                </div>
                <div className="draft-venue">
                  <FiMapPin /> {draft.venue || 'No venue'}
                </div>
                <div className="draft-meta">
                  <FiClock /> {new Date(draft.timestamp).toLocaleString()}
                </div>
                {draft.editingId && (
                  <div className="draft-badge-small">Editing</div>
                )}
              </div>
              <button className="delete-draft-btn" onClick={(e) => deleteDraft(draft.key, e)}>
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
)}

{/* Add this after the drafts-list div, before closing the drafts-panel */}
{savedDrafts.length > 0 && (
  <div className="drafts-footer">
    <button className="clear-all-drafts" onClick={() => {
      if (window.confirm("Delete ALL saved drafts?")) {
        localStorage.removeItem('programDraft');
        loadSavedDrafts();
        setShowDraftsList(false);
        showNotification("All drafts cleared", "info");
      }
    }}>
      Clear All Drafts
    </button>
  </div>
)}

        <div className="search-filter-bar">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input type="text" placeholder="Search programs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
          </div>
          <select className="filter-select" value={filterVenue} onChange={(e) => setFilterVenue(e.target.value)}>
            <option value="all">All Venues</option>
            {venues.filter(v => v !== 'all').map(venue => (<option key={venue} value={venue}>{venue}</option>))}
          </select>
        </div>

        {canModify && (
          <AnimatePresence>
            {isFormOpen && (
              <motion.div className="form-card" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="form-header">
                  <h3 className="form-title">{editingId ? 'Edit Program' : 'Create New Program'}</h3>
                </div>
                
                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label"><FiCalendar /> Date</label>
                      <input type="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} required className="form-input" />
                    </div>
                    <div className="form-group">
                      <label className="form-label"><FiMapPin /> Venue</label>
                      <input type="text" value={form.venue} onChange={(e) => handleChange("venue", e.target.value)} placeholder="e.g., Main Church" required className="form-input" />
                    </div>
                  </div>

                  <div className="songs-grid">
                    {songFields.map(field => (
                      <div key={field.key} className="song-field">
                        <label className="song-label">
                          <span className="song-icon">{field.icon}</span>
                          <span>{field.label}</span>
                          {field.required && <span className="required-badge">Required</span>}
                          <span className="song-limit">(Max: {field.maxSongs})</span>
                        </label>
                        
                        <div className="multi-song-inputs">
                          {form.songs[field.key].map((song, idx) => {
                            const searchId = `${field.key}-${idx}`;
                            const results = songSearchResults[searchId] || [];
                            const isSearching = searchingFields[searchId];
                            const showDropdown = activeField === searchId && results.length > 0;
                            
                            return (
                              <div key={idx} className="song-input-group">
                                <div className="song-number">{idx + 1}.</div>
                                <input
                                  type="text"
                                  value={song}
                                  onChange={(e) => handleSongChange(field.key, idx, e.target.value)}
                                  placeholder={`${field.label} - enter song title then click search...`}
                                  className="song-input"
                                  autoComplete="off"
                                />
                                <button
                                  type="button"
                                  onClick={() => performSearch(field.key, idx, song)}
                                  className="search-song-btn"
                                  disabled={isSearching || !song || song.trim().length < 2}
                                  title="Search for this song"
                                >
                                  {isSearching ? (
                                    <span className="spinner-small"></span>
                                  ) : (
                                    <FiSearch />
                                  )}
                                  <span>Search</span>
                                </button>
                                {form.songs[field.key].length > 1 && (
                                  <button 
                                    type="button" 
                                    onClick={() => removeSongSlot(field.key, idx)} 
                                    className="remove-song-btn" 
                                    title="Remove this song"
                                  >
                                    <FiMinus />
                                  </button>
                                )}
                                
                                {showDropdown && (
                                  <div className="song-search-dropdown">
                                    {results.map((result) => (
                                      <div 
                                        key={result.id} 
                                        className="song-search-item" 
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          selectSong(field.key, idx, result.title);
                                        }}
                                      >
                                        <div className="song-search-title">🎵 {result.title}</div>
                                        {result.reference && <div className="song-search-ref">📖 {result.reference}</div>}
                                        {result.preview && <div className="song-search-preview">{result.preview}</div>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {form.songs[field.key].length < field.maxSongs && (
                            <button type="button" onClick={() => addSongSlot(field.key)} className="add-song-btn">
                              <FiPlus /> Add another {field.label.toLowerCase()}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {formError && (
                    <div className="form-error"><FiAlertCircle /><span>{formError}</span></div>
                  )}

                  <div className="form-actions">
                    <button type="button" onClick={handleCancelProgram} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary" disabled={isSaving}>
                      {isSaving ? (<><span className="spinner-small"></span><span>{editingId ? 'Updating...' : 'Creating...'}</span></>) : (<><FiSave /><span>{editingId ? 'Update Program' : 'Create Program'}</span></>)}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <div className="content-area">
          {loading ? (
            <div className="loading-state"><div className="spinner"></div><p>Loading programs...</p></div>
          ) : filteredPrograms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><GiChurch /></div>
              <h3>No programs found</h3>
              <p>{searchTerm || filterVenue !== 'all' ? 'Try adjusting your search' : 'Create your first mass program'}</p>
              {!searchTerm && filterVenue === 'all' && canModify && (<button className="btn-primary" onClick={() => setIsFormOpen(true)}><FiPlus /> Create Program</button>)}
            </div>
          ) : (
            <div className="programs-list">
              {filteredPrograms.map((program, index) => (
                <motion.div key={program.id} className="program-card" ref={el => programRefs.current[program.id] = el} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <div className="program-header" onClick={() => toggleProgram(program.id)}>
                    <div className="program-info">
                      <div className="program-date"><FiCalendar /><span>{formatDate(program.date)}</span></div>
                      <div className="program-venue"><FiMapPin /><span>{program.venue}</span></div>
                    </div>
              <div className="program-actions">
  {canModify && (
    <button className="action-btn edit" onClick={(e) => { e.stopPropagation(); handleEdit(program); }} title="Edit">
      <FiEdit2 />
    </button>
  )}
  
  {/* ADD THIS BOOKLET BUTTON - RIGHT HERE */}
  <button 
    className="action-btn booklet" 
    onClick={(e) => { 
      e.stopPropagation(); 
      setSelectedProgramForBooklet(program);
    }} 
    title="View Full Booklet with Lyrics"
  >
    <FiBook />
  </button>
  
  <div className="download-dropdown">
    <button className="action-btn download" onClick={(e) => { e.stopPropagation(); toggleDropdown(program.id); }} title="Download" disabled={generatingImage}>
      <FiDownload />
    </button>
    {activeDropdown === program.id && (
      <div className="download-menu">
        <button onClick={(e) => { e.stopPropagation(); downloadAsWord(program); toggleDropdown(null); }}><BsFileWord /> Word Document</button>
        <button onClick={(e) => { e.stopPropagation(); downloadAsPDF(program); toggleDropdown(null); }}><BsFilePdf /> PDF (Print)</button>
        <button onClick={(e) => { e.stopPropagation(); downloadAsImage(program); toggleDropdown(null); }}><BsFileImage /> Image (PNG)</button>
      </div>
    )}
  </div>
  
  {canModify && (
    <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); handleDelete(program.id); }} title="Delete">
      <FiTrash2 />
    </button>
  )}
  
  <button className="expand-btn" onClick={(e) => { e.stopPropagation(); toggleProgram(program.id); }}>
    {expandedPrograms[program.id] ? <FiChevronUp /> : <FiChevronDown />}
  </button>
</div>
                  </div>

                  <AnimatePresence>
                    {expandedPrograms[program.id] && (
                      <motion.div className="program-details" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <div className="songs-display">
                          {songFields.map(field => {
                            const songsArray = getSongsArray(program, field.key);
                            return (
                              <div key={field.key} className="song-display-item">
                                <span className="song-display-label"><span className="song-icon">{field.icon}</span>{field.label}</span>
                                <div className="song-display-value">
                                  {songsArray.length > 0 ? songsArray.map((song, idx) => (
                                    <div key={idx} className="song-line">{idx + 1}. {song}</div>
                                  )) : <span className="no-song">—</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

        {selectedProgramForBooklet && (
        <BookletModal 
          program={selectedProgramForBooklet} 
          onClose={() => setSelectedProgramForBooklet(null)} 
        />
      )}

      <style>{`
        .songs-page { min-height: 100vh; margin-top: 50px; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; }
        .background-image, .background-overlay { display: none; }
        .content-wrapper { max-width: 1400px; margin: 0 auto; position: relative; z-index: 1; }
        
        .notification { position: fixed; top: 84px; right: 24px; padding: 12px 20px; border-radius: 12px; color: white; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 10px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .notification.success { background: #10b981; }
        .notification.error { background: #ef4444; }
        .notification.info { background: #3b82f6; }
        
        .header { background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 20px 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .title-icon { width: 48px; height: 48px; background: #eff6ff; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #3b82f6; }
        .page-title { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; }
        .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
        .header-actions { display: flex; align-items: center; gap: 12px; }
        
        .btn-icon { width: 42px; height: 42px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; transition: all 0.2s; }
        .btn-icon:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
        .btn-primary { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
        .btn-primary:hover { background: #2563eb; transform: translateY(-1px); }
        .btn-secondary { background: white; color: #475569; border: 1px solid #e2e8f0; padding: 10px 20px; border-radius: 12px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
        .btn-secondary:hover { background: #f8fafc; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Drafts Panel Styles */
.drafts-panel {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  overflow: hidden;
}

.drafts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.drafts-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.close-drafts {
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  padding: 4px;
  border-radius: 8px;
}

.close-drafts:hover {
  background: #e2e8f0;
}

.drafts-list {
  max-height: 400px;
  overflow-y: auto;
}

.draft-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s;
}

.draft-item:hover {
  background: #eff6ff;
}

.draft-info {
  flex: 1;
}

.draft-title, .draft-venue, .draft-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
}

.draft-title { color: #0f172a; font-weight: 500; }
.draft-venue { color: #475569; }
.draft-meta { color: #94a3b8; font-size: 11px; margin-bottom: 0; }

.draft-badge-small {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #fef3c7;
  color: #d97706;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  margin-top: 6px;
  width: fit-content;
}

.delete-draft-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 8px;
  border-radius: 8px;
}

.delete-draft-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}

.no-drafts {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
}

.no-drafts p {
  margin: 0 0 4px 0;
  font-size: 14px;
}

.no-drafts small {
  font-size: 11px;
}

.drafts-footer {
  padding: 12px 20px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  text-align: right;
}

.clear-all-drafts {
  background: none;
  border: 1px solid #e2e8f0;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  color: #dc2626;
  cursor: pointer;
}

.clear-all-drafts:hover {
  background: #fef2f2;
  border-color: #fecaca;
}
        
        .draft-indicator { display: flex; align-items: center; gap: 12px; padding: 12px 20px; background: #fffbeb; border-radius: 12px; margin-bottom: 20px; color: #d97706; font-size: 14px; border: 1px solid #fde68a; }
        .draft-clear { margin-left: auto; background: none; border: none; color: #d97706; padding: 4px 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 12px; }
        .draft-clear:hover { background: #fef3c7; }
        
        .search-filter-bar { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .search-box { flex: 1; min-width: 250px; position: relative; }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 18px; }
        .search-input { width: 100%; padding: 12px 16px 12px 44px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; background: white; transition: all 0.2s; }
        .search-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .filter-select { padding: 12px 20px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; color: #0f172a; background: white; cursor: pointer; min-width: 160px; }
        
        .form-card { background: white; border-radius: 20px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .form-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .form-title { font-size: 18px; font-weight: 600; color: #0f172a; margin: 0; }
        .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 24px; }
        .form-group { margin-bottom: 0; }
        .form-label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 8px; }
        .form-input { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; transition: all 0.2s; }
        .form-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        
        .songs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 24px; }
        .song-field { display: flex; flex-direction: column; gap: 10px; padding: 16px; background: #fafbfc; border-radius: 12px; border: 1px solid #e2e8f0; }
        .song-label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #0f172a; flex-wrap: wrap; }
        .required-badge { font-size: 10px; padding: 2px 8px; background: #fee2e2; color: #dc2626; border-radius: 12px; font-weight: 500; }
        .song-limit { font-size: 10px; color: #64748b; font-weight: normal; }
        .multi-song-inputs { display: flex; flex-direction: column; gap: 8px; }
        .song-input-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; position: relative; }
        .song-number { width: 28px; font-size: 13px; font-weight: 600; color: #64748b; }
        .song-input { flex: 2; min-width: 180px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; background: white; }
        .song-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        
        .search-song-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .search-song-btn:hover:not(:disabled) { background: #2563eb; }
        .search-song-btn:disabled { background: #94a3b8; cursor: not-allowed; }
        
        .remove-song-btn { width: 36px; height: 36px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #dc2626; transition: all 0.2s; }
        .remove-song-btn:hover { background: #fee2e2; }
        .add-song-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; background: white; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 12px; font-weight: 500; color: #3b82f6; cursor: pointer; transition: all 0.2s; margin-top: 4px; width: 100%; }
        .add-song-btn:hover { background: #eff6ff; border-color: #3b82f6; }
        
        .song-search-dropdown { 
          position: absolute; 
          top: 100%; 
          left: 0; 
          right: 0; 
          background: white; 
          border: 1px solid #e2e8f0; 
          border-radius: 8px; 
          max-height: 260px; 
          overflow-y: auto; 
          z-index: 1000; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
          margin-top: 4px;
        }
        .song-search-item { padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; }
        .song-search-item:hover { background: #eff6ff; }
        .song-search-title { font-weight: 600; font-size: 13px; color: #0f172a; }
        .song-search-ref { font-size: 11px; color: #64748b; margin-top: 2px; }
        .song-search-preview { font-size: 11px; color: #94a3b8; margin-top: 2px; font-style: italic; }
        
        .form-error { display: flex; align-items: center; gap: 10px; padding: 14px; background: #fef2f2; border-radius: 10px; color: #dc2626; font-size: 14px; margin-bottom: 20px; border: 1px solid #fecaca; }
        .form-actions { display: flex; justify-content: flex-end; gap: 16px; margin-top: 24px; }
        
        .programs-list { display: flex; flex-direction: column; gap: 16px; }
        .program-card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .program-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .program-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; cursor: pointer; background: #fafbfc; border-bottom: 1px solid #f1f5f9; }
        .program-info { display: flex; gap: 24px; flex-wrap: wrap; }
        .program-date, .program-venue { display: flex; align-items: center; gap: 8px; color: #475569; font-size: 14px; }
        .program-actions { display: flex; align-items: center; gap: 8px; }
        .action-btn { width: 36px; height: 36px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; transition: all 0.2s; }
        .action-btn:hover { background: #f8fafc; }
        .action-btn.edit:hover { background: #eff6ff; color: #3b82f6; border-color: #bfdbfe; }
        .action-btn.delete:hover { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        .action-btn.download:hover { background: #ecfdf5; color: #10b981; border-color: #a7f3d0; }
        .expand-btn { background: none; border: none; color: #94a3b8; cursor: pointer; width: 36px; height: 36px; }
        .download-dropdown { position: relative; }
        .download-menu { position: absolute; right: 0; top: 100%; background: white; border-radius: 12px; padding: 8px; min-width: 200px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15); z-index: 10; border: 1px solid #e2e8f0; margin-top: 8px; }
        .download-menu button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; border: none; background: none; color: #1e293b; font-size: 13px; cursor: pointer; border-radius: 8px; }
        .download-menu button:hover { background: #f1f5f9; }
        
        .program-details { padding: 20px; border-top: 1px solid #e2e8f0; background: white; }
        .songs-display { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
        .song-display-item { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; }
        .song-display-label { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #475569; }
        .song-display-value { font-size: 13px; color: #0f172a; padding-left: 26px; }
        .song-line { margin-bottom: 4px; }
        .no-song { color: #94a3b8; font-style: italic; }
        
        .loading-state { text-align: center; padding: 60px 20px; background: white; border-radius: 16px; color: #64748b; border: 1px solid #e2e8f0; }
        .spinner { width: 48px; height: 48px; margin: 0 auto 16px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        .spinner-small { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
        .empty-state { text-align: center; padding: 60px 20px; background: white; border-radius: 16px; border: 2px dashed #e2e8f0; }
        .empty-icon { font-size: 64px; margin-bottom: 16px; opacity: 0.5; }
        .empty-state h3 { font-size: 18px; font-weight: 600; margin: 0 0 8px; color: #0f172a; }
        
        @media (max-width: 768px) {
          .songs-page { padding: 16px; }
          .header { flex-direction: column; align-items: flex-start; }
          .header-actions { width: 100%; justify-content: space-between; }
          .search-filter-bar { flex-direction: column; }
          .filter-select { width: 100%; }
          .program-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .program-info { width: 100%; justify-content: space-between; }
          .program-actions { width: 100%; justify-content: flex-end; }
          .form-actions { flex-direction: column; }
          .form-actions button { width: 100%; }
          .songs-grid { grid-template-columns: 1fr; }
          .songs-display { grid-template-columns: 1fr; }
          .download-menu { right: auto; left: 0; }
          .song-input-group { flex-direction: column; align-items: stretch; }
          .song-number { width: 100%; }
          .search-song-btn { justify-content: center; }
          .song-search-dropdown { position: static; margin-top: 4px; }
        }



        .action-btn.booklet { background: #f3e8ff; color: #9333ea; border-color: #e9d5ff; }
.action-btn.booklet:hover { background: #e9d5ff; color: #7e22ce; }
      `}</style>
    </div>
  );
}