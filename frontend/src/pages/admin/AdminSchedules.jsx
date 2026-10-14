import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import DatePicker from "react-datepicker";
import ReactQuill from "react-quill";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "react-quill/dist/quill.snow.css";
import "react-datepicker/dist/react-datepicker.css";
import { createPortal } from 'react-dom';
import BASE_URL from "../../api";
import { FaCalendar, FaCalendarAlt, FaTrash, FaEdit, FaDownload, FaPlus, FaTimes } from "react-icons/fa";                                   

function AdminSchedules() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showDraftsPanel, setShowDraftsPanel] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState("structured");
  const [toast, setToast] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const previewRef = useRef(null);
  const [freeContent, setFreeContent] = useState("");
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(null);
  const [showSavedNotifications, setShowSavedNotifications] = useState(false);
  const [savedNotifications, setSavedNotifications] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingOCRImage, setPendingOCRImage] = useState(null);
  const fileInputRef = useRef(null);
  
  const UNSAVED_KEY = "unsaved_schedule_data";
  const NOTIFICATIONS_KEY = "schedule_notifications";
  
  const idCounterRef = useRef(1000000);
  
  const getUniqueId = useCallback(() => {
    idCounterRef.current += 1;
    return idCounterRef.current;
  }, []);
  
  const [formData, setFormData] = useState({
    title: "",
    semesterPeriod: { start: null, end: null },
    generalPoints: [
      { id: getUniqueId(), text: "" }
    ],
    sections: [
      {
        id: getUniqueId(),
        title: "",
        tableRows: [{ id: getUniqueId(), date: "", dateValue: null, event: "" }],
        freeText: ""
      }
    ],
    additionalNotes: "",
    isPublished: false
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote", "code-block"],
      [{ align: [] }],
      ["link", "image", "video"],
      ["clean"]
    ]
  };

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const setActionLoadingState = useCallback((action, isLoading) => {
    setActionLoading(prev => ({ ...prev, [action]: isLoading }));
  }, []);

  const handleImageUploadForOCR = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showToast("❌ Image too large. Max 5MB.", "error");
      return;
    }
    
    setPendingOCRImage(file);
    showToast("📸 Image uploaded. Switch to Structured Mode to extract schedule.", "info");
  };

  const parseExtractedTextToSchedule = (text) => {
    const result = { hasData: false, sections: [], generalPoints: [] };
    if (!text || !text.trim()) return result;
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i].includes("SEMESTER SCHEDULE") || lines[i].includes("MAY-AUGUST")) {
        result.title = lines[i];
        result.hasData = true;
        break;
      }
    }
    
    const bulletPoints = [];
    let inActivities = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes("activities will take place")) {
        inActivities = true;
        continue;
      }
      if (inActivities && lines[i].match(/^[-•*]/)) {
        if (lines[i].toUpperCase() === lines[i] && lines[i].length > 10) {
          inActivities = false;
        } else {
          bulletPoints.push(lines[i].replace(/^[-•*]\s*/, ''));
        }
      }
      if (inActivities && lines[i].match(/^\d/)) {
        inActivities = false;
      }
    }
    
    if (bulletPoints.length > 0) {
      result.generalPoints = bulletPoints.map((point, idx) => ({
        id: getUniqueId(),
        text: point
      }));
      result.hasData = true;
    }
    
    const sections = [];
    let currentSection = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if ((line === line.toUpperCase() && line.length > 15) || 
          line.includes("MASS ANIMATIONS") ||
          line.includes("OUTDOOR ACTIVITIES")) {
        if (currentSection && currentSection.rows.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          title: line,
          rows: []
        };
      } else if (currentSection) {
        const dateMatch = line.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (dateMatch) {
          let date = dateMatch[0];
          let event = line.replace(dateMatch[0], '').trim();
          event = event.replace(/^[-•*]\s*/, '');
          
          if (event.includes("St ") || event.includes("ZUCA") || event.includes("Cultural")) {
            const eventParts = event.split(/\s+(?=St\s|ZUCA|Cultural)/);
            for (let part of eventParts) {
              if (part.trim()) {
                currentSection.rows.push({
                  id: getUniqueId(),
                  date: date,
                  dateValue: null,
                  event: part.trim()
                });
                date = "";
              }
            }
          } else {
            currentSection.rows.push({
              id: getUniqueId(),
              date: date,
              dateValue: null,
              event: event || "Event"
            });
          }
        } else if (line.match(/^\d/)) {
          const parts = line.split(/\s+/);
          if (parts.length >= 2) {
            currentSection.rows.push({
              id: getUniqueId(),
              date: parts[0],
              dateValue: null,
              event: parts.slice(1).join(" ")
            });
          }
        }
      }
    }
    
    if (currentSection && currentSection.rows.length > 0) {
      sections.push(currentSection);
    }
    
    for (let s = 0; s < sections.length; s++) {
      result.sections.push({
        id: getUniqueId(),
        title: sections[s].title,
        tableRows: sections[s].rows,
        freeText: ""
      });
      result.hasData = true;
    }
    
    return result;
  };

  const processImageWithOCR = async (imageFile) => {
    if (!imageFile) return;
    
    setUploadingImage(true);
    const formDataOCR = new FormData();
    formDataOCR.append('image', imageFile);
    
    try {
      const response = await axios.post(`${BASE_URL}/api/ocr/ocr-space`, formDataOCR, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        timeout: 60000
      });
      
      if (response.data.success && response.data.text) {
        const extractedText = response.data.text;
        setFreeContent(extractedText);
        
        const parsedData = parseExtractedTextToSchedule(extractedText);
        
        if (parsedData.hasData) {
          if (parsedData.title) {
            setFormData(prev => ({ ...prev, title: parsedData.title }));
          }
          if (parsedData.generalPoints && parsedData.generalPoints.length > 0) {
            setFormData(prev => ({ ...prev, generalPoints: parsedData.generalPoints }));
          }
          if (parsedData.sections && parsedData.sections.length > 0) {
            setFormData(prev => ({ ...prev, sections: parsedData.sections }));
          }
          showToast(`✅ Schedule extracted from image! Found ${parsedData.sections?.length || 0} sections.`, "success");
        } else {
          showToast(`📝 Text extracted (${response.data.wordCount || 'unknown'} words). Please fill form manually.`, "info");
        }
      } else {
        showToast("❌ No text detected in image. Try a clearer image with good lighting.", "error");
      }
    } catch (err) {
      console.error("OCR error:", err);
      const errorMsg = err.response?.data?.error || err.message || "Failed to extract text";
      showToast(`❌ OCR failed: ${errorMsg}`, "error");
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    if (activeTab === "structured" && pendingOCRImage) {
      processImageWithOCR(pendingOCRImage);
      setPendingOCRImage(null);
    }
  }, [activeTab, pendingOCRImage]);

  const loadSavedNotifications = useCallback(() => {
    const saved = localStorage.getItem(NOTIFICATIONS_KEY);
    if (saved) {
      try {
        const notifications = JSON.parse(saved);
        setSavedNotifications(notifications);
      } catch (e) {
        console.error("Error loading notifications:", e);
      }
    }
  }, []);

  const getPreviewText = (formDataState) => {
    const parts = [];
    if (formDataState.title) parts.push(`Title: ${formDataState.title.substring(0, 30)}`);
    const sectionCount = formDataState.sections.length;
    if (sectionCount > 0) parts.push(`${sectionCount} section(s)`);
    const rowCount = formDataState.sections.reduce((sum, s) => sum + s.tableRows.length, 0);
    if (rowCount > 0) parts.push(`${rowCount} event(s)`);
    return parts.join(" | ") || "Empty schedule";
  };

  const addNotification = useCallback((formDataState, action = "autosaved", success = true) => {
    const hasTitle = formDataState.title && formDataState.title.trim().length > 0;
    const hasGeneralPoints = formDataState.generalPoints.some(p => p.text && p.text.trim().length > 0);
    const hasSections = formDataState.sections.some(s => 
      s.title?.trim() || s.tableRows.some(r => r.date || r.event) || s.freeText?.trim()
    );
    
    if (!hasTitle && !hasGeneralPoints && !hasSections) {
      return null;
    }

    const notification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action: action,
      success: success,
      title: formDataState.title || "Untitled Schedule",
      preview: getPreviewText(formDataState)
    };

    setSavedNotifications(prev => {
      const newNotifications = [notification, ...prev].slice(0, 20);
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(newNotifications));
      return newNotifications;
    });

    return notification;
  }, []);

  const deleteNotification = useCallback(async (id) => {
    setActionLoadingState(`delete_notif_${id}`, true);
    setSavedNotifications(prev => {
      const newNotifications = prev.filter(n => n.id !== id);
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(newNotifications));
      return newNotifications;
    });
    setActionLoadingState(`delete_notif_${id}`, false);
    showToast("🗑️ Notification deleted", "success");
  }, [showToast, setActionLoadingState]);

  const clearAllNotifications = useCallback(async () => {
    if (window.confirm("Delete all saved notifications?")) {
      setActionLoadingState("clear_all_notif", true);
      setSavedNotifications([]);
      localStorage.removeItem(NOTIFICATIONS_KEY);
      setActionLoadingState("clear_all_notif", false);
      showToast("🗑️ All notifications cleared", "success");
    }
  }, [showToast, setActionLoadingState]);

  const autoSaveToLocal = useCallback(() => {
    const hasContent = formData.title?.trim() || 
      formData.generalPoints.some(p => p.text?.trim()) ||
      formData.sections.some(s => s.title?.trim() || s.tableRows.some(r => r.date || r.event));
    
    if (!hasContent) return;
    
    const unsavedData = {
      formData,
      freeContent,
      activeTab,
      editingId,
      editingDraftId,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(UNSAVED_KEY, JSON.stringify(unsavedData));
  }, [formData, freeContent, activeTab, editingId, editingDraftId]);

  const loadUnsavedFromLocal = useCallback(() => {
    const saved = localStorage.getItem(UNSAVED_KEY);
    if (saved) {
      try {
        const unsavedData = JSON.parse(saved);
        const savedTime = new Date(unsavedData.timestamp);
        const now = new Date();
        const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          const hasContent = unsavedData.formData.title || 
            unsavedData.formData.generalPoints?.some(p => p.text);
          
          if (hasContent && window.confirm("You have unsaved changes from " + savedTime.toLocaleString() + ". Do you want to restore them?")) {
            setFormData(unsavedData.formData);
            setFreeContent(unsavedData.freeContent || "");
            setActiveTab(unsavedData.activeTab || "structured");
            setEditingId(unsavedData.editingId || null);
            setEditingDraftId(unsavedData.editingDraftId || null);
            setShowForm(true);
            showToast("🔄 Unsaved changes restored", "success");
            return true;
          }
        }
        localStorage.removeItem(UNSAVED_KEY);
      } catch (e) {
        console.error("Error loading unsaved data:", e);
      }
    }
    return false;
  }, [showToast]);

  useEffect(() => {
    let interval;
    if (showForm && !previewMode) {
      interval = setInterval(autoSaveToLocal, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showForm, previewMode, autoSaveToLocal]);

  const fetchSchedules = useCallback(async () => {
    setActionLoadingState("fetch_schedules", true);
    try {
      const response = await axios.get(`${BASE_URL}/api/schedules`, { headers });
      setSchedules(response.data);
    } catch (err) {
      console.error("Error fetching schedules:", err);
      showToast("Failed to load schedules. Check your connection.", "error");
    } finally {
      setActionLoadingState("fetch_schedules", false);
    }
  }, [BASE_URL, headers, showToast, setActionLoadingState]);

  const fetchDrafts = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/schedules/drafts`, { headers });
      setDrafts(response.data);
    } catch (err) {
      console.error("Error fetching drafts:", err);
    }
  }, [BASE_URL, headers]);

  useEffect(() => {
    if (!initialLoadDone) {
      fetchSchedules();
      fetchDrafts();
      loadSavedNotifications();
      loadUnsavedFromLocal();
      setInitialLoadDone(true);
    }
  }, [fetchSchedules, fetchDrafts, loadSavedNotifications, loadUnsavedFromLocal, initialLoadDone]);

  const buildFullDocumentHTML = useCallback(() => {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${formData.title || "Schedule"}</title>
        <style>
          body { font-family: 'Times New Roman', Arial, sans-serif; font-size: 12pt; line-height: 1.4; margin: 0 auto; padding: 40px; max-width: 900px; }
          h1 { font-size: 20pt; font-weight: bold; margin: 10pt 0; text-align: center; }
          h2 { font-size: 18pt; font-weight: bold; margin: 8pt 0; text-align: center; }
          h3 { font-size: 16pt; font-weight: bold; margin: 6pt 0; border-left: 3px solid #3b82f6; padding-left: 10px; }
          table { border-collapse: collapse; width: 100%; margin: 15px 0; }
          th, td { border: 1px solid #999; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f5f5f5; font-weight: bold; }
          ul, ol { margin: 5px 0; padding-left: 20px; }
          li { margin: 3px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 9pt; color: #666; }
        </style>
      </head>
      <body>
        <div>
          <h1>ZETECH UNIVERSITY CATHOLIC ACTION</h1>
          <h2>${formData.title || "Schedule"}</h2>
          ${formData.semesterPeriod.start ? `<p style="text-align: center;">📅 ${new Date(formData.semesterPeriod.start).toLocaleDateString()} - ${new Date(formData.semesterPeriod.end).toLocaleDateString()}</p>` : ''}
          <div style="margin: 20px 0;">
            <p><strong>Activities will take place as follows:</strong></p>
            <ul>
              ${formData.generalPoints.filter(p => p.text && p.text.trim()).map(p => `<li>${p.text}</li>`).join('')}
            </ul>
          </div>
    `;
    
    formData.sections.forEach(section => {
      if (section.title || section.tableRows.some(r => r.date || r.event)) {
        html += `
          <div style="margin: 25px 0;">
            <h3>${section.title || "Section"}</h3>
            <table>
              <thead>
                <tr><th>DATE</th><th>EVENT</th></tr>
              </thead>
              <tbody>
                ${section.tableRows.filter(row => row.date && row.event).map(row => `
                  <tr><td>${row.date}</td><td>${row.event}</td></tr>
                `).join('')}
              </tbody>
            </table>
            ${section.freeText ? `<p>${section.freeText}</p>` : ''}
          </div>
        `;
      }
    });
    
    html += `
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc;">
          ${formData.additionalNotes ? formData.additionalNotes.split('\n').map(line => `<p>${line}</p>`).join('') : ''}
        </div>
        <div class="footer">ZUCA PORTAL AUTO SYSTEM GENERATED</div>
      </body>
      </html>
    `;
    return html;
  }, [formData]);

 const extractEventsFromSections = () => {
  const events = [];
  formData.sections.forEach(section => {
    section.tableRows.forEach(row => {
      if (row.event && row.event.trim()) {
        let validDate = null;
        if (row.dateValue && row.dateValue instanceof Date && !isNaN(row.dateValue)) {
          validDate = row.dateValue;
        } else if (row.date) {
          const parsed = parseDateString(row.date);
          validDate = parsed;
        }
        if (validDate && row.event) {
          const year = validDate.getFullYear();
          const month = String(validDate.getMonth() + 1).padStart(2, '0');
          const day = String(validDate.getDate()).padStart(2, '0');
          
          events.push({
            title: `${section.title || "Event"} - ${row.event}`,
            eventDate: `${year}-${month}-${day}`,
            eventTime: "16:30",
            location: "TBA",
            groupName: row.event,
            reminderDays: [7, 1, 0]
          });
        }
      }
    });
  });
  return events;
};
const parseDateString = (dateStr) => {
  if (!dateStr) return null;
  const currentYear = new Date().getFullYear();
  const monthMap = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  const parts = dateStr.split(' ');
  if (parts.length === 2) {
    let day = parseInt(parts[0]);
    let month = monthMap[parts[1]];
    if (!isNaN(day) && month !== undefined) {
      // ✅ Create date at 12:00 UTC to avoid timezone shift
      return new Date(Date.UTC(currentYear, month, day, 12, 0, 0));
    }
  }
  return null;
};
  const saveAsDraft = async () => {
    setActionLoadingState("save_draft", true);
    
    if (!formData.title || formData.title.trim() === "") {
      showToast("❌ Title is required to save as draft", "error");
      setActionLoadingState("save_draft", false);
      return;
    }
    
    const draftData = {
      title: formData.title,
      formData: formData,
      freeContent: freeContent,
      activeTab: activeTab
    };
    
    try {
      let response;
      if (editingDraftId) {
        response = await axios.put(`${BASE_URL}/api/admin/schedules/drafts/${editingDraftId}`, draftData, { headers });
        showToast("✅ Draft updated successfully", "success");
        setEditingDraftId(null);
      } else {
        response = await axios.post(`${BASE_URL}/api/admin/schedules/drafts`, draftData, { headers });
        showToast("✅ Draft saved successfully", "success");
      }
      fetchDrafts();
      setShowDraftsPanel(true);
      addNotification(formData, "draft-saved", true);
      localStorage.removeItem(UNSAVED_KEY);
    } catch (err) {
      console.error("Error saving draft:", err);
      const errorMsg = err.response?.data?.error || err.message || "Failed to save draft";
      showToast(`❌ ${errorMsg}`, "error");
      addNotification(formData, "draft-failed", false);
    } finally {
      setActionLoadingState("save_draft", false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoadingState("publish", true);
    
    if (!formData.title || formData.title.trim() === "") {
      showToast("❌ Schedule title is required", "error");
      setActionLoadingState("publish", false);
      return;
    }
    
    const content = buildFullDocumentHTML();
    const events = extractEventsFromSections();
    
    const startDateValue = formData.semesterPeriod?.start instanceof Date && !isNaN(formData.semesterPeriod.start)
      ? formData.semesterPeriod.start 
      : null;
    const endDateValue = formData.semesterPeriod?.end instanceof Date && !isNaN(formData.semesterPeriod.end)
      ? formData.semesterPeriod.end 
      : null;
    
    const payload = {
      title: formData.title.trim(),
      content: content,
      description: formData.title.trim(),
      startDate: startDateValue,
      endDate: endDateValue,
      isPublished: formData.isPublished || false,
      events: events,
      sections: formData.sections,
      generalPoints: formData.generalPoints.filter(p => p.text && p.text.trim()),
      additionalNotes: formData.additionalNotes || "",
      freeContent: freeContent,
      activeTab: activeTab,
      semesterPeriod: {
        start: startDateValue,
        end: endDateValue
      }
    };
    
    try {
      let response;
      if (editingId) {
        response = await axios.put(`${BASE_URL}/api/admin/schedules/${editingId}`, payload, { headers });
        showToast("✅ Schedule updated successfully!", "success");
        addNotification(formData, "updated", true);
      } else {
        response = await axios.post(`${BASE_URL}/api/admin/schedules`, payload, { headers });
        showToast("✅ Schedule published successfully! Users will be notified.", "success");
        addNotification(formData, "published", true);
      }
      
      fetchSchedules();
      setShowForm(false);
      setPreviewMode(false);
      resetForm();
      localStorage.removeItem(UNSAVED_KEY);
    } catch (err) {
      console.error("Error saving schedule:", err);
      let errorMessage = "Failed to save schedule";
      
      if (err.response) {
        errorMessage = err.response.data?.error || err.response.data?.message || `Server error: ${err.response.status}`;
        console.error("Response data:", err.response.data);
        console.error("Response status:", err.response.status);
      } else if (err.request) {
        errorMessage = "No response from server. Check your connection.";
      } else {
        errorMessage = err.message || "Unknown error occurred";
      }
      
      showToast(`❌ ${errorMessage}`, "error");
      addNotification(formData, editingId ? "update-failed" : "publish-failed", false);
    } finally {
      setActionLoadingState("publish", false);
    }
  };

  const downloadAsPDF = async (scheduleData = null) => {
    setActionLoadingState("download_pdf", true);
    try {
      const dataToUse = scheduleData || formData;
      const fullHtml = buildFullDocumentHTMLForSchedule(dataToUse);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fullHtml;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '900px';
      tempDiv.style.background = 'white';
      document.body.appendChild(tempDiv);
      
      const canvas = await html2canvas(tempDiv, { scale: 2, logging: false, useCORS: true });
      document.body.removeChild(tempDiv);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`${(dataToUse.title || "schedule").replace(/\s/g, '_')}.pdf`);
      showToast("📄 PDF downloaded successfully", "success");
    } catch (err) {
      console.error("PDF error:", err);
      showToast("❌ Failed to generate PDF", "error");
    } finally {
      setActionLoadingState("download_pdf", false);
      setDownloadDropdownOpen(null);
    }
  };

  const buildFullDocumentHTMLForSchedule = (scheduleData) => {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${scheduleData.title || "Schedule"}</title>
        <style>
          body { font-family: 'Times New Roman', Arial, sans-serif; font-size: 12pt; line-height: 1.4; margin: 0 auto; padding: 40px; max-width: 900px; }
          h1 { font-size: 20pt; font-weight: bold; margin: 10pt 0; text-align: center; }
          h2 { font-size: 18pt; font-weight: bold; margin: 8pt 0; text-align: center; }
          h3 { font-size: 16pt; font-weight: bold; margin: 6pt 0; border-left: 3px solid #3b82f6; padding-left: 10px; }
          table { border-collapse: collapse; width: 100%; margin: 15px 0; }
          th, td { border: 1px solid #999; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f5f5f5; font-weight: bold; }
          ul, ol { margin: 5px 0; padding-left: 20px; }
          li { margin: 3px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 9pt; color: #666; }
        </style>
      </head>
      <body>
        <div>
          <h1>ZETECH UNIVERSITY CATHOLIC ACTION</h1>
          <h2>${scheduleData.title || "Schedule"}</h2>
          ${scheduleData.semesterPeriod?.start ? `<p style="text-align: center;">📅 ${new Date(scheduleData.semesterPeriod.start).toLocaleDateString()} - ${new Date(scheduleData.semesterPeriod.end).toLocaleDateString()}</p>` : ''}
          <div style="margin: 20px 0;">
            <p><strong>Activities will take place as follows:</strong></p>
            <ul>
              ${scheduleData.generalPoints?.filter(p => p.text && p.text.trim()).map(p => `<li>${p.text}</li>`).join('')}
            </ul>
          </div>
    `;
    
    scheduleData.sections?.forEach(section => {
      if (section.title || section.tableRows?.some(r => r.date || r.event)) {
        html += `
          <div style="margin: 25px 0;">
            <h3>${section.title || "Section"}</h3>
            <table>
              <thead>
                <tr><th>DATE</th><th>EVENT</th></tr>
              </thead>
              <tbody>
                ${section.tableRows?.filter(row => row.date && row.event).map(row => `
                  <tr><td>${row.date}</td><td>${row.event}</td></tr>
                `).join('')}
              </tbody>
            </table>
            ${section.freeText ? `<p>${section.freeText}</p>` : ''}
          </div>
        `;
      }
    });
    
    html += `
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc;">
          ${scheduleData.additionalNotes ? scheduleData.additionalNotes.split('\n').map(line => `<p>${line}</p>`).join('') : ''}
        </div>
        <div class="footer">ZUCA PORTAL AUTO SYSTEM GENERATED</div>
      </body>
      </html>
    `;
    return html;
  };

  const downloadAsImage = async (scheduleData = null) => {
    setActionLoadingState("download_image", true);
    try {
      const dataToUse = scheduleData || formData;
      const fullHtml = buildFullDocumentHTMLForSchedule(dataToUse);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fullHtml;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '900px';
      tempDiv.style.background = 'white';
      document.body.appendChild(tempDiv);
      
      const canvas = await html2canvas(tempDiv, { scale: 2, logging: false, useCORS: true });
      document.body.removeChild(tempDiv);
      
      const link = document.createElement('a');
      link.download = `${(dataToUse.title || "schedule").replace(/\s/g, '_')}.png`;
      link.href = canvas.toDataURL();
      link.click();
      showToast("🖼️ Image downloaded successfully", "success");
    } catch (err) {
      console.error("Image error:", err);
      showToast("❌ Failed to generate image", "error");
    } finally {
      setActionLoadingState("download_image", false);
      setDownloadDropdownOpen(null);
    }
  };

  const downloadAsWord = (scheduleData = null) => {
    setActionLoadingState("download_word", true);
    try {
      const dataToUse = scheduleData || formData;
      
      let wordHtml = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${dataToUse.title || "Schedule"}</title>
        <style>
          body { font-family: 'Times New Roman', Arial, sans-serif; font-size: 12pt; margin: 1in; }
          h1 { font-size: 18pt; text-align: center; }
          h2 { font-size: 16pt; text-align: center; }
          h3 { font-size: 14pt; border-left: 3px solid #3b82f6; padding-left: 10px; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background: #f0f0f0; }
          .footer { text-align: center; margin-top: 20px; font-size: 9pt; color: #666; }
        </style>
      </head>
      <body>
        <h1>ZETECH UNIVERSITY CATHOLIC ACTION</h1>
        <h2>${dataToUse.title || "Schedule"}</h2>`;
      
      if (dataToUse.generalPoints?.some(p => p.text?.trim())) {
        wordHtml += `<ul>`;
        dataToUse.generalPoints.filter(p => p.text?.trim()).forEach(p => {
          wordHtml += `<li>${p.text}</li>`;
        });
        wordHtml += `</ul>`;
      }
      
      dataToUse.sections?.forEach(section => {
        const validRows = section.tableRows?.filter(r => r.date && r.event) || [];
        if (validRows.length > 0) {
          wordHtml += `<h3>${section.title || "Section"}</h3>`;
          wordHtml += `<table><thead><tr><th>DATE</th><th>EVENT</th></tr></thead><tbody>`;
          validRows.forEach(row => {
            wordHtml += `<tr><td>${row.date}</td><td>${row.event}</td></tr>`;
          });
          wordHtml += `</tbody></table>`;
        }
      });
      
      wordHtml += `<div class="footer">ZUCA PORTAL AUTO SYSTEM GENERATED</div></body></html>`;
      
      const blob = new Blob([wordHtml], { type: 'application/msword' });
      const link = document.createElement('a');
      link.download = `${(dataToUse.title || "schedule").replace(/\s/g, '_')}.doc`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      showToast("📝 Word document downloaded successfully", "success");
    } catch (err) {
      console.error("Word error:", err);
      showToast("❌ Failed to generate Word document", "error");
    } finally {
      setActionLoadingState("download_word", false);
      setDownloadDropdownOpen(null);
    }
  };

  const resetForm = () => {
    if (window.confirm("Are you sure you want tosave current changes.")) {
      setFormData({
        title: "",
        semesterPeriod: { start: null, end: null },
        generalPoints: [{ id: getUniqueId(), text: "" }],
        sections: [{
          id: getUniqueId(),
          title: "",
          tableRows: [{ id: getUniqueId(), date: "", dateValue: null, event: "" }],
          freeText: ""
        }],
        additionalNotes: "",
        isPublished: false
      });
      setFreeContent("");
      setActiveTab("structured");
      setEditingId(null);
      setEditingDraftId(null);
      setPreviewMode(false);
      localStorage.removeItem(UNSAVED_KEY);
      showToast("🔄 Form reset", "info");
    }
  };

  const deleteSchedule = async (id) => {
    if (window.confirm("Delete this schedule permanently?")) {
      setActionLoadingState(`delete_schedule_${id}`, true);
      try {
        await axios.delete(`${BASE_URL}/api/admin/schedules/${id}`, { headers });
        fetchSchedules();
        showToast("🗑️ Schedule deleted successfully", "success");
      } catch (err) {
        console.error("Error deleting:", err);
        showToast("❌ Failed to delete schedule", "error");
      } finally {
        setActionLoadingState(`delete_schedule_${id}`, false);
      }
    }
  };

  const editSchedule = (schedule) => {
    setActionLoadingState("edit_schedule", true);
    setTimeout(() => {
      let sections = schedule.sections;
      if (!sections || sections.length === 0) {
        sections = [{
          id: getUniqueId(),
          title: "",
          tableRows: [{ id: getUniqueId(), date: "", dateValue: null, event: "" }],
          freeText: ""
        }];
      } else {
        sections = sections.map(section => {
          const parsedRows = (section.tableRows || []).map(row => {
            let dateValue = null;
            let dateDisplay = row.date || "";
            
            if (row.date) {
              const parsed = parseDateString(row.date);
              if (parsed) {
                dateValue = parsed;
                dateDisplay = parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              }
            }
            
            return {
              id: getUniqueId(),
              date: dateDisplay,
              dateValue: dateValue,
              event: row.event || ""
            };
          });
          
          return {
            ...section,
            id: getUniqueId(),
            tableRows: parsedRows
          };
        });
      }

      let startDate = null;
      let endDate = null;
      
      if (schedule.startDate) {
        const parsedStart = new Date(schedule.startDate);
        if (!isNaN(parsedStart.getTime())) startDate = parsedStart;
      }
      if (schedule.endDate) {
        const parsedEnd = new Date(schedule.endDate);
        if (!isNaN(parsedEnd.getTime())) endDate = parsedEnd;
      }

      setFormData({
        title: schedule.title || "",
        semesterPeriod: { 
          start: startDate,
          end: endDate
        },
        generalPoints: schedule.generalPoints && schedule.generalPoints.length > 0 
          ? schedule.generalPoints.map(p => ({ ...p, id: getUniqueId() }))
          : [{ id: getUniqueId(), text: "" }],
        sections: sections,
        additionalNotes: schedule.additionalNotes || "",
        isPublished: schedule.isPublished || false
      });
      
      setFreeContent(schedule.freeContent || "");
      setActiveTab(schedule.activeTab || "structured");
      setEditingId(schedule.id);
      setShowForm(true);
      localStorage.removeItem(UNSAVED_KEY);
      setActionLoadingState("edit_schedule", false);
      showToast("📝 Schedule loaded for editing", "success");
    }, 300);
  };

  const viewSchedule = (schedule) => {
    setActionLoadingState("view_schedule", true);
    setTimeout(() => {
      setFormData({
        title: schedule.title || "",
        semesterPeriod: { 
          start: schedule.startDate ? new Date(schedule.startDate) : null, 
          end: schedule.endDate ? new Date(schedule.endDate) : null 
        },
        generalPoints: schedule.generalPoints || [{ id: getUniqueId(), text: "" }],
        sections: schedule.sections || [],
        additionalNotes: schedule.additionalNotes || "",
        isPublished: schedule.isPublished
      });
      setPreviewMode(true);
      setShowForm(true);
      setEditingId(null);
      setActionLoadingState("view_schedule", false);
    }, 300);
  };

  const addGeneralPoint = () => {
    setFormData(prev => ({
      ...prev,
      generalPoints: [...prev.generalPoints, { id: getUniqueId(), text: "" }]
    }));
  };

  const updateGeneralPoint = (id, text) => {
    setFormData(prev => ({
      ...prev,
      generalPoints: prev.generalPoints.map(p => p.id === id ? { ...p, text } : p)
    }));
  };

  const removeGeneralPoint = (id) => {
    setFormData(prev => ({
      ...prev,
      generalPoints: prev.generalPoints.filter(p => p.id !== id)
    }));
  };

  const addSection = () => {
    setFormData(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: getUniqueId(),
          title: "",
          tableRows: [{ id: getUniqueId(), date: "", dateValue: null, event: "" }],
          freeText: ""
        }
      ]
    }));
  };

  const removeSection = (sectionId) => {
    if (formData.sections.length === 1) {
      showToast("You need at least one section", "warning");
      return;
    }
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
  };

  const updateSectionTitle = (sectionId, title) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === sectionId ? { ...s, title } : s)
    }));
  };

  const updateSectionFreeText = (sectionId, freeText) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === sectionId ? { ...s, freeText } : s)
    }));
  };

  const addTableRow = (sectionId) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { 
              ...s, 
              tableRows: [
                ...s.tableRows, 
                { id: getUniqueId(), date: "", dateValue: null, event: "" }
              ] 
            }
          : s
      )
    }));
  };

  const updateTableRowDate = (sectionId, rowId, date, dateValue) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { 
              ...s, 
              tableRows: s.tableRows.map(r => 
                r.id === rowId ? { ...r, date, dateValue } : r
              ) 
            }
          : s
      )
    }));
  };

  const updateTableRowEvent = (sectionId, rowId, event) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { 
              ...s, 
              tableRows: s.tableRows.map(r => 
                r.id === rowId ? { ...r, event } : r
              ) 
            }
          : s
      )
    }));
  };

  const removeTableRow = (sectionId, rowId) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, tableRows: s.tableRows.filter(r => r.id !== rowId) }
          : s
      )
    }));
  };

  const loadDraft = (draft) => {
    setActionLoadingState("load_draft", true);
    setTimeout(() => {
      const freshFormData = JSON.parse(JSON.stringify(draft.formData));
      
      freshFormData.generalPoints = freshFormData.generalPoints.map(p => ({
        ...p,
        id: getUniqueId()
      }));
      
      freshFormData.sections = freshFormData.sections.map(section => ({
        ...section,
        id: getUniqueId(),
        tableRows: section.tableRows.map(row => ({
          ...row,
          id: getUniqueId()
        }))
      }));
      
      setFormData(freshFormData);
      setFreeContent(draft.freeContent || "");
      setActiveTab(draft.activeTab || "structured");
      setEditingDraftId(draft.id);
      setShowForm(true);
      setShowDraftsPanel(false);
      localStorage.removeItem(UNSAVED_KEY);
      setActionLoadingState("load_draft", false);
      showToast("📝 Draft loaded successfully", "success");
    }, 300);
  };

  const deleteDraft = async (id) => {
    if (window.confirm("Delete this draft permanently?")) {
      setActionLoadingState(`delete_draft_${id}`, true);
      try {
        await axios.delete(`${BASE_URL}/api/admin/schedules/drafts/${id}`, { headers });
        fetchDrafts();
        showToast("🗑️ Draft deleted successfully", "success");
      } catch (err) {
        console.error("Error deleting draft:", err);
        showToast("❌ Failed to delete draft", "error");
      } finally {
        setActionLoadingState(`delete_draft_${id}`, false);
      }
    }
  };

  const LoadingSpinner = ({ size = 20 }) => (
    <div style={{
      display: "inline-block",
      width: size,
      height: size,
      border: "2px solid #f3f3f3",
      borderTop: `2px solid ${size === 16 ? "#64748b" : "white"}`,
      borderRadius: "50%",
      animation: "spin 1s linear infinite"
    }} />
  );

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      {toast && (
        <div style={{
          ...styles.toast,
          background: toast.type === "success" ? "#22c55e" : toast.type === "error" ? "#ef4444" : toast.type === "warning" ? "#f59e0b" : "#3b82f6"
        }}>
          {toast.message}
        </div>
      )}

      <div style={styles.header}>
        <button onClick={() => navigate("/dashboard")} style={styles.backButton}>← Back</button>
        <h1 style={styles.title}>📅 Semester Schedule Manager</h1>
        <div style={styles.headerButtons}>
          <button onClick={() => { resetForm(); setShowForm(true); setEditingDraftId(null); }} style={styles.addButton}>+ New Schedule</button>
          <button onClick={() => setShowDraftsPanel(!showDraftsPanel)} style={styles.draftsButton}>
            📝 Drafts ({drafts.length})
          </button>
          <button onClick={() => setShowSavedNotifications(!showSavedNotifications)} style={styles.notificationButton}>
            🔔 Notifications ({savedNotifications.length})
          </button>
        </div>
      </div>

      {showSavedNotifications && (
        <div style={styles.notificationsPanel}>
          <div style={styles.notificationsHeader}>
            <h3>📋 Activity Log</h3>
            <div>
              {savedNotifications.length > 0 && (
                <button onClick={clearAllNotifications} style={styles.clearAllBtn} disabled={actionLoading.clear_all_notif}>
                  {actionLoading.clear_all_notif ? <LoadingSpinner size={16} /> : "🗑️ Clear All"}
                </button>
              )}
              <button onClick={() => setShowSavedNotifications(false)} style={styles.closeNotifBtn}>✕</button>
            </div>
          </div>
          {savedNotifications.length === 0 ? (
            <div style={styles.noNotifications}>No activity yet. Your schedule actions will appear here!</div>
          ) : (
            <div style={styles.notificationsList}>
              {savedNotifications.map((notif) => (
                <div key={notif.id} style={{...styles.notificationCard, borderLeft: `3px solid ${notif.success ? '#22c55e' : '#ef4444'}`}}>
                  <div style={styles.notificationIcon}>
                    {notif.action === "published" && (notif.success ? "✅" : "❌")}
                    {notif.action === "updated" && (notif.success ? "✏️" : "❌")}
                    {notif.action === "draft-saved" && (notif.success ? "💾" : "❌")}
                    {notif.action === "auto-saved" && "🔄"}
                  </div>
                  <div style={styles.notificationContent}>
                    <div style={styles.notificationTitle}>
                      <strong>
                        {notif.action === "published" ? (notif.success ? "Published" : "Publish Failed") : 
                         notif.action === "updated" ? (notif.success ? "Updated" : "Update Failed") : 
                         notif.action === "draft-saved" ? (notif.success ? "Draft Saved" : "Save Failed") : 
                         "Auto-Saved"}
                      </strong>
                      <span style={styles.notificationTime}>
                        {new Date(notif.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div style={styles.notificationPreview}>{notif.preview}</div>
                  </div>
                  <button onClick={() => deleteNotification(notif.id)} style={styles.deleteNotifBtn}>
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showDraftsPanel && (
        <div style={styles.draftsPanel}>
          <div style={styles.draftsHeader}>
            <h3>📝 Saved Drafts</h3>
            <button onClick={() => setShowDraftsPanel(false)} style={styles.closeDraftsBtn}>✕</button>
          </div>
          {drafts.length === 0 ? (
            <div style={styles.noDrafts}>No drafts saved yet. Create a schedule and save as draft!</div>
          ) : (
            <div style={styles.draftsList}>
              {drafts.map((draft) => (
                <div key={draft.id} style={styles.draftCard}>
                  <div style={styles.draftInfo}>
                    <strong>{draft.title || "Untitled"}</strong>
                    <small>Last edited: {new Date(draft.updatedAt).toLocaleString()}</small>
                  </div>
                  <div style={styles.draftActions}>
                    <button onClick={() => loadDraft(draft)} style={styles.loadDraftBtn} disabled={actionLoading.load_draft}>
                      {actionLoading.load_draft ? <LoadingSpinner size={14} /> : "Load"}
                    </button>
                    <button onClick={() => deleteDraft(draft.id)} style={styles.deleteDraftBtn} disabled={actionLoading[`delete_draft_${draft.id}`]}>
                      {actionLoading[`delete_draft_${draft.id}`] ? <LoadingSpinner size={14} /> : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={styles.scheduleList}>
        <h2 style={styles.sectionTitle}>📋 Published Schedules</h2>
        {actionLoading.fetch_schedules ? (
          <div style={styles.loadingContainer}>
            <LoadingSpinner size={40} />
            <p>Loading schedules...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div style={styles.emptyState}>No published schedules yet. Create your first schedule!</div>
        ) : (
          schedules.map((schedule) => (
            <motion.div key={schedule.id} style={styles.scheduleCard}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.scheduleTitle}>{schedule.title || "Untitled"}</h3>
                  <p style={styles.scheduleMeta}>
                    {schedule.startDate && `📅 ${new Date(schedule.startDate).toLocaleDateString()} - ${new Date(schedule.endDate).toLocaleDateString()}`}
                  </p>
                </div>
                <div style={styles.cardActions}>
                  <button onClick={() => viewSchedule(schedule)} style={styles.viewBtn} disabled={actionLoading.view_schedule}>
                    {actionLoading.view_schedule ? <LoadingSpinner size={14} /> : "👁️ View"}
                  </button>
                  <button onClick={() => editSchedule(schedule)} style={styles.editBtn} disabled={actionLoading.edit_schedule}>
                    {actionLoading.edit_schedule ? <LoadingSpinner size={14} /> : "✏️ Edit"}
                  </button>
                  <button onClick={() => deleteSchedule(schedule.id)} style={styles.deleteBtn} disabled={actionLoading[`delete_schedule_${schedule.id}`]}>
                    {actionLoading[`delete_schedule_${schedule.id}`] ? <LoadingSpinner size={14} /> : "🗑️ Delete"}
                  </button>
                  <div style={styles.downloadDropdown}>
                    <button onClick={() => setDownloadDropdownOpen(downloadDropdownOpen === schedule.id ? null : schedule.id)} style={styles.downloadDropdownBtn}>
                      ⬇️ Download ▼
                    </button>
                    {downloadDropdownOpen === schedule.id && (
                      <div style={styles.downloadDropdownMenu}>
                        <button onClick={() => downloadAsPDF(schedule)} style={styles.dropdownItem}>📄 PDF</button>
                        <button onClick={() => downloadAsImage(schedule)} style={styles.dropdownItem}>🖼️ Image</button>
                        <button onClick={() => downloadAsWord(schedule)} style={styles.dropdownItem}>📝 Word</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={styles.cardPreview} dangerouslySetInnerHTML={{ __html: schedule.content?.substring(0, 200) + "..." || "No content" }} />
            </motion.div>
          ))
        )}
      </div>

      {showForm && createPortal(
        <div style={styles.fullPageForm}>
          <div style={styles.fullPageHeader}>
            <h2>{editingId ? "Edit" : previewMode ? "View" : "Create"} Semester Schedule</h2>
            <div>
              {previewMode ? (
                <button onClick={() => setPreviewMode(false)} style={styles.backToEditBtn}>✏️ Back to Edit</button>
              ) : (
                <button onClick={() => setPreviewMode(true)} style={styles.previewBtn}>👁️ Preview</button>
              )}
              <button onClick={() => { setShowForm(false); setPreviewMode(false); }} style={styles.closeBtn}>✕</button>
            </div>
          </div>

          {previewMode ? (
            <>
              <div style={styles.downloadBar}>
                <button onClick={() => downloadAsPDF()} style={styles.downloadBtn}>📄 PDF</button>
                <button onClick={() => downloadAsImage()} style={styles.downloadBtn}>🖼️ Image</button>
                <button onClick={() => downloadAsWord()} style={styles.downloadBtn}>📝 Word</button>
              </div>
              <div ref={previewRef}>
                <div style={styles.previewContainer} dangerouslySetInnerHTML={{ __html: buildFullDocumentHTML() }} />
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.tabContainer}>
                <button type="button" onClick={() => setActiveTab("structured")} style={{...styles.tab, background: activeTab === "structured" ? "#3b82f6" : "#f1f5f9", color: activeTab === "structured" ? "white" : "#475569"}}>
                  📋 Structured Mode
                </button>
                <button type="button" onClick={() => setActiveTab("free")} style={{...styles.tab, background: activeTab === "free" ? "#3b82f6" : "#f1f5f9", color: activeTab === "free" ? "white" : "#475569"}}>
                  📝 Free Mode
                </button>
              </div>

              {activeTab === "free" ? (
                <div style={styles.sectionCard}>
                  <h3>📝 Paste Your Schedule Here</h3>
                  <p style={styles.hint}>Paste any formatted text, table, or document. Use the button below to upload an image and extract schedule data.</p>
                  
                  <div style={{ marginBottom: "15px" }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageUploadForOCR}
                      style={{ display: "none" }}
                      id="ocr-upload-input"
                    />
                    <label 
                      htmlFor="ocr-upload-input" 
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 20px",
                        background: uploadingImage ? "#cbd5e1" : "#8b5cf6",
                        color: "white",
                        borderRadius: "8px",
                        cursor: uploadingImage ? "not-allowed" : "pointer",
                        fontWeight: "500",
                        fontSize: "14px"
                      }}
                    >
                      {uploadingImage ? "⏳ Processing..." : "📸 Upload Image to Extract Schedule"}
                    </label>
                    {pendingOCRImage && !uploadingImage && (
                      <span style={{ marginLeft: "10px", fontSize: "12px", color: "#10b981" }}>
                        ✓ Image ready. Switch to Structured Mode to extract.
                      </span>
                    )}
                  </div>
                  
                  <ReactQuill 
                    theme="snow" 
                    value={freeContent} 
                    onChange={setFreeContent} 
                    modules={quillModules} 
                    style={styles.freeEditor} 
                  />
                </div>
              ) : (
                <>
                  <div style={styles.formGroup}>
                    <label>Schedule Title *</label>
                    <input 
                      type="text" 
                      value={formData.title} 
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} 
                      style={styles.input} 
                      placeholder="e.g., Semester 1 Schedule 2024" 
                      required
                    />
                  </div>

                  <div style={styles.row}>
                    <div style={styles.formGroup}>
                      <label>Semester Start</label>
                      <DatePicker 
                        selected={formData.semesterPeriod.start} 
                        onChange={(date) => setFormData(prev => ({ ...prev, semesterPeriod: { ...prev.semesterPeriod, start: date } }))} 
                        dateFormat="dd/MM/yyyy" 
                        placeholderText="Select start date" 
                        isClearable
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label>Semester End</label>
                      <DatePicker 
                        selected={formData.semesterPeriod.end} 
                        onChange={(date) => setFormData(prev => ({ ...prev, semesterPeriod: { ...prev.semesterPeriod, end: date } }))} 
                        dateFormat="dd/MM/yyyy" 
                        placeholderText="Select end date" 
                        isClearable
                      />
                    </div>
                  </div>

                  <div style={styles.sectionCard}>
                    <h3>📝 General Information</h3>
                    {formData.generalPoints.map((point) => (
                      <div key={point.id} style={styles.bulletRow}>
                        <input 
                          type="text" 
                          value={point.text} 
                          onChange={(e) => updateGeneralPoint(point.id, e.target.value)} 
                          style={styles.bulletInput} 
                          placeholder="Enter a general point..." 
                        />
                        <button type="button" onClick={() => removeGeneralPoint(point.id)} style={styles.removeBtn}>✕</button>
                      </div>
                    ))}
                    <button type="button" onClick={addGeneralPoint} style={styles.addBtn}>+ Add Point</button>
                  </div>

                  {formData.sections.map((section) => (
                    <div key={section.id} style={styles.sectionCard}>
                      <div style={styles.sectionHeader}>
                        <input 
                          type="text" 
                          value={section.title} 
                          onChange={(e) => updateSectionTitle(section.id, e.target.value)} 
                          style={styles.sectionTitleInput} 
                          placeholder="Section Title (e.g., INTERNAL MASS ANIMATIONS.)" 
                        />
                        <button type="button" onClick={() => removeSection(section.id)} style={styles.removeSectionBtn}>Remove Section</button>
                      </div>

                      <div style={styles.tableContainer}>
                        <table style={styles.table}>
                          <thead>
                            <tr><th>DATE</th><th>EVENT/LEADING</th><th></th></tr>
                          </thead>
                          <tbody>
                            {section.tableRows.map((row) => (
                              <tr key={row.id}>
                                <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                                  <div style={styles.dateInputWrapper}>
                                    <input
                                      type="text"
                                      value={row.date}
                                      onChange={(e) => updateTableRowDate(section.id, row.id, e.target.value, null)}
                                      style={styles.dateTextInput}
                                      placeholder="e.g., 20th May"
                                      readOnly
                                    />
                                    <DatePicker
                                      selected={row.dateValue}
                                      onChange={(date) => {
                                        const dateDisplay = date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : "";
                                        updateTableRowDate(section.id, row.id, dateDisplay, date);
                                      }}
                                      dateFormat="dd/MM/yyyy"
                                      customInput={<button type="button" style={styles.calendarBtn}><FaCalendarAlt /></button>}
                                    />
                                  </div>
                                  </td>
                                <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                                  <input
                                    type="text"
                                    value={row.event}
                                    onChange={(e) => updateTableRowEvent(section.id, row.id, e.target.value)}
                                    style={styles.tableInput}
                                    placeholder="Event/Leading (e.g., Leaders Meeting)"
                                  />
                                  </td>
                                <td style={{ border: "1px solid #e2e8f0", padding: "8px", width: "50px" }}>
                                  <button type="button" onClick={() => removeTableRow(section.id, row.id)} style={styles.removeRowBtn}>✕</button>
                                  </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button type="button" onClick={() => addTableRow(section.id)} style={styles.addRowBtn}>+ Add Row</button>
                      </div>

                      <div style={styles.freeTextZone}>
                        <textarea 
                          value={section.freeText} 
                          onChange={(e) => updateSectionFreeText(section.id, e.target.value)} 
                          style={styles.textarea} 
                          rows={2} 
                          placeholder="Additional notes for this section..." 
                        />
                      </div>
                    </div>
                  ))}

                  <button type="button" onClick={addSection} style={styles.addSectionBtn}>+ Add New Section</button>

                  <div style={styles.sectionCard}>
                    <h3>📍 Additional Information</h3>
                    <textarea 
                      value={formData.additionalNotes} 
                      onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))} 
                      style={styles.textarea} 
                      rows={3} 
                      placeholder="Any additional information or notes for the entire schedule..." 
                    />
                  </div>
                </>
              )}

              <div style={styles.formGroup}>
                <label style={styles.checkbox}>
                  <input type="checkbox" checked={formData.isPublished} onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))} />
                  Publish immediately (users will see and get notified)
                </label>
              </div>

              <div style={styles.formActions}>
                <button type="button" onClick={saveAsDraft} disabled={actionLoading.save_draft} style={styles.draftSaveBtn}>
                  {actionLoading.save_draft ? <LoadingSpinner size={14} /> : "💾 Save as Draft"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setPreviewMode(false); }} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading.publish} style={styles.submitBtn}>
                  {actionLoading.publish ? <LoadingSpinner size={14} /> : (editingId ? "Update Schedule" : "Publish Schedule")}
                </button>
              </div>
            </form>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#f8fafc", padding: "20px", paddingTop: "80px", fontFamily: "'Inter', sans-serif" },
  toast: { position: "fixed", top: "80px", left: "50%", transform: "translateX(-50%)", padding: "10px 20px", borderRadius: "8px", color: "white", zIndex: 10000, fontSize: "14px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
  loadingContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px", gap: "10px", color: "#64748b" },
  
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "15px" },
  headerButtons: { display: "flex", gap: "10px" },
  backButton: { padding: "8px 16px", background: "#64748b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  title: { fontSize: "24px", fontWeight: "700", color: "#1e293b" },
  addButton: { padding: "10px 20px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  draftsButton: { padding: "10px 20px", background: "#8b5cf6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  notificationButton: { padding: "10px 20px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  
  notificationsPanel: { background: "white", borderRadius: "16px", padding: "20px", marginBottom: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  notificationsHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #e2e8f0" },
  closeNotifBtn: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" },
  clearAllBtn: { padding: "4px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", marginRight: "10px" },
  noNotifications: { textAlign: "center", padding: "40px", color: "#64748b" },
  notificationsList: { display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" },
  notificationCard: { display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" },
  notificationIcon: { fontSize: "24px" },
  notificationContent: { flex: 1 },
  notificationTitle: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" },
  notificationTime: { fontSize: "11px", color: "#94a3b8" },
  notificationPreview: { fontSize: "13px", color: "#475569", marginBottom: "6px" },
  deleteNotifBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px 8px", borderRadius: "4px", color: "#94a3b8" },
  
  draftsPanel: { background: "white", borderRadius: "16px", padding: "20px", marginBottom: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  draftsHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #e2e8f0" },
  closeDraftsBtn: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" },
  noDrafts: { textAlign: "center", padding: "40px", color: "#64748b" },
  draftsList: { display: "flex", flexDirection: "column", gap: "10px" },
  draftCard: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 15px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" },
  draftInfo: { display: "flex", flexDirection: "column", gap: "4px" },
  draftActions: { display: "flex", gap: "8px" },
  loadDraftBtn: { padding: "6px 12px", minWidth: "60px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  deleteDraftBtn: { padding: "6px 12px", minWidth: "60px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  
  scheduleList: { display: "flex", flexDirection: "column", gap: "20px" },
  sectionTitle: { fontSize: "18px", fontWeight: "600", color: "#1e293b", marginBottom: "15px" },
  scheduleCard: { background: "white", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px", flexWrap: "wrap", gap: "10px" },
  scheduleTitle: { fontSize: "18px", fontWeight: "600", color: "#1e293b", marginBottom: "5px" },
  scheduleMeta: { fontSize: "12px", color: "#64748b" },
  cardActions: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" },
  viewBtn: { padding: "6px 12px", minWidth: "65px", background: "#10b981", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  editBtn: { padding: "6px 12px", minWidth: "65px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  deleteBtn: { padding: "6px 12px", minWidth: "65px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  downloadDropdown: { position: "relative", display: "inline-block" },
  downloadDropdownBtn: { padding: "6px 12px", background: "#6366f1", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  downloadDropdownMenu: { position: "absolute", top: "100%", right: 0, background: "white", minWidth: "120px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", borderRadius: "8px", zIndex: 10, overflow: "hidden" },
  dropdownItem: { display: "block", width: "100%", padding: "10px 15px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#1e293b" },
  cardPreview: { fontSize: "14px", color: "#475569", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #e2e8f0" },
  emptyState: { textAlign: "center", padding: "60px", background: "white", borderRadius: "16px", color: "#64748b" },
  
  fullPageForm: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "#f8fafc",
    zIndex: 99999999990,
    overflowY: "auto",
    padding: "20px",
    paddingTop: "80px",
  },
  fullPageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    paddingBottom: "15px",
    borderBottom: "1px solid #e2e8f0",
    flexWrap: "wrap",
    gap: "10px",
  },
  previewContainer: { padding: "30px", background: "white", borderRadius: "16px", maxHeight: "calc(100vh - 250px)", overflowY: "auto" },
  tabContainer: { display: "flex", gap: "10px", marginBottom: "20px" },
  tab: { flex: 1, padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" },
  input: { padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", width: "100%" },
  textarea: { padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit", resize: "vertical", width: "100%" },
  sectionCard: { border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", background: "#fafafa", marginBottom: "15px" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" },
  sectionTitleInput: { flex: 1, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "16px", fontWeight: "600" },
  removeSectionBtn: { padding: "6px 12px", background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  hint: { fontSize: "12px", color: "#64748b", marginBottom: "12px" },
  bulletRow: { display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" },
  bulletInput: { flex: 1, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px" },
  removeBtn: { padding: "6px 10px", background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "6px", cursor: "pointer" },
  addBtn: { padding: "8px 16px", background: "#f1f5f9", border: "1px dashed #cbd5e1", borderRadius: "8px", cursor: "pointer", width: "100%", marginTop: "5px" },
  tableContainer: { overflowX: "auto", marginBottom: "15px" },
  table: { width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "8px" },
  dateInputWrapper: { display: "flex", gap: "5px", alignItems: "center" },
  dateTextInput: { flex: 1, padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: "4px", fontSize: "13px" },
  calendarBtn: { padding: "6px 8px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "4px", cursor: "pointer", fontSize: "14px" },
  tableInput: { width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: "4px", fontSize: "13px" },
  removeRowBtn: { background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "4px", cursor: "pointer", padding: "4px 8px" },
  addRowBtn: { padding: "6px 12px", background: "#f1f5f9", border: "1px dashed #cbd5e1", borderRadius: "6px", cursor: "pointer", width: "100%", marginTop: "5px" },
  freeTextZone: { marginTop: "12px" },
  addSectionBtn: { padding: "12px 20px", background: "#e0e7ff", color: "#4f46e5", border: "2px dashed #818cf8", borderRadius: "12px", cursor: "pointer", fontWeight: "600", marginBottom: "15px", width: "100%" },
  freeEditor: { height: "400px", marginBottom: "50px" },
  checkbox: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" },
  formActions: { display: "flex", justifyContent: "flex-end", gap: "15px", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e2e8f0" },
  cancelBtn: { padding: "10px 20px", background: "#f1f5f9", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500" },
  draftSaveBtn: { padding: "10px 20px", minWidth: "130px", background: "#8b5cf6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  submitBtn: { padding: "10px 20px", minWidth: "140px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  downloadBar: { display: "flex", gap: "10px", justifyContent: "flex-end", marginBottom: "20px", flexWrap: "wrap" },
  downloadBtn: { padding: "8px 16px", minWidth: "80px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" },
  backToEditBtn: { padding: "8px 16px", background: "#f59e0b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", marginRight: "10px" },
  previewBtn: { padding: "8px 16px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", marginRight: "10px" },
  closeBtn: { background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#64748b" },
};

export default AdminSchedules;