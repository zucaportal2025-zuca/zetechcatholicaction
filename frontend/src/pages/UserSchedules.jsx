// frontend/src/pages/UserSchedules.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { FaCalendarDay, FaEye } from "react-icons/fa";
import { FiCalendar, FiList } from "react-icons/fi";

function UserSchedules() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/schedules?published=true');
      const sortedSchedules = response.data.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      setSchedules(sortedSchedules);
    } catch (err) {
      console.error("Error fetching schedules:", err);
      showToast("Failed to load schedules", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load recently viewed from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recently_viewed_schedules");
    if (stored) {
      try {
        setRecentlyViewed(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Request fullscreen when modal opens
  useEffect(() => {
    if (showModal) {
      const modalElement = document.querySelector('.modal-content');
      if (modalElement && modalElement.requestFullscreen) {
        modalElement.requestFullscreen();
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [showModal]);

  // Listen for fullscreen change to close modal when exiting fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && showModal) {
        setShowModal(false);
        setSelectedSchedule(null);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [showModal]);

  const addToRecentlyViewed = (schedule) => {
    const updated = [schedule, ...recentlyViewed.filter(s => s.id !== schedule.id)].slice(0, 5);
    setRecentlyViewed(updated);
    localStorage.setItem("recently_viewed_schedules", JSON.stringify(updated));
  };

  const viewSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setShowModal(true);
    addToRecentlyViewed(schedule);
  };

  const closeModal = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen();
    }
    setShowModal(false);
    setSelectedSchedule(null);
  };

  // Download functions
  const downloadAsPDF = async (schedule) => {
    setDownloadLoading(true);
    try {
      const fullHtml = buildFullDocumentHTML(schedule);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fullHtml;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '900px';
      tempDiv.style.background = 'white';
      document.body.appendChild(tempDiv);
      
      const canvas = await html2canvas(tempDiv, { scale: 2, logging: false });
      document.body.removeChild(tempDiv);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`${schedule.title.replace(/\s/g, '_')}.pdf`);
      showToast("📄 PDF downloaded", "success");
    } catch (err) {
      console.error("PDF error:", err);
      showToast("❌ Failed to generate PDF", "error");
    } finally {
      setDownloadLoading(false);
    }
  };

  const downloadAsImage = async (schedule) => {
    setDownloadLoading(true);
    try {
      const fullHtml = buildFullDocumentHTML(schedule);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fullHtml;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '900px';
      tempDiv.style.background = 'white';
      document.body.appendChild(tempDiv);
      
      const canvas = await html2canvas(tempDiv, { scale: 2, logging: false });
      document.body.removeChild(tempDiv);
      
      const link = document.createElement('a');
      link.download = `${schedule.title.replace(/\s/g, '_')}.png`;
      link.href = canvas.toDataURL();
      link.click();
      showToast("🖼️ Image downloaded", "success");
    } catch (err) {
      console.error("Image error:", err);
      showToast("❌ Failed to generate image", "error");
    } finally {
      setDownloadLoading(false);
    }
  };

  const downloadAsWord = (schedule) => {
    setDownloadLoading(true);
    try {
      const fullHtml = buildFullDocumentHTML(schedule);
      const blob = new Blob([fullHtml], { type: 'application/msword' });
      const link = document.createElement('a');
      link.download = `${schedule.title.replace(/\s/g, '_')}.doc`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      showToast("📝 Word document downloaded", "success");
    } catch (err) {
      console.error("Word error:", err);
      showToast("❌ Failed to generate Word document", "error");
    } finally {
      setDownloadLoading(false);
    }
  };

  const buildFullDocumentHTML = (schedule) => {
    const sections = schedule.sections || [];
    const generalPoints = schedule.generalPoints || [];
    const additionalNotes = schedule.additionalNotes || "";
    
    let html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${schedule.title}</title>
      <style>
        body { 
          font-family: 'Times New Roman', Arial, sans-serif; 
          font-size: 12pt;
          line-height: 1.4;
          margin: 0 auto;
          padding: 40px;
          max-width: 900px;
        }
        h1 { font-size: 20pt; font-weight: bold; margin: 10pt 0; text-align: center; }
        h2 { font-size: 18pt; font-weight: bold; margin: 8pt 0; text-align: center; }
        h3 { font-size: 16pt; font-weight: bold; margin: 6pt 0; border-left: 3px solid #3b82f6; padding-left: 10px; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; page-break-inside: avoid; }
        th, td { border: 1px solid #999; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f5f5f5; font-weight: bold; }
        ul, ol { margin: 5px 0; padding-left: 20px; }
        li { margin: 3px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 9pt; color: #666; page-break-before: avoid; }
      </style>
    </head>
    <body>
      <div>
        <h1>ZETECH UNIVERSITY CATHOLIC ACTION</h1>
        <h2>${schedule.title}</h2>
        ${schedule.startDate ? `<p style="text-align: center;">📅 ${new Date(schedule.startDate).toLocaleDateString()} - ${new Date(schedule.endDate).toLocaleDateString()}</p>` : ''}
        
        <div style="margin: 20px 0;">
          <p><strong>The ${schedule.title} activities will take place as follows:</strong></p>
          <ul>
            ${generalPoints.filter(p => p.text && p.text.trim()).map(p => `<li>${p.text}</li>`).join('')}
          </ul>
        </div>
    `;
    
    sections.forEach(section => {
      const validRows = section.tableRows?.filter(r => r.date && r.event) || [];
      if (section.title || validRows.length > 0 || section.freeText) {
        html += `
          <div style="margin: 25px 0;">
            <h3>${section.title || "Section"}</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr><th>DATE</th><th>EVENT/LEADING</th></tr>
              </thead>
              <tbody>
                ${validRows.map(row => `
                  <tr>
                    <td>${row.date}</td>
                    <td>${row.event}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${section.freeText ? `<p style="margin-top: 10px;">${section.freeText}</p>` : ''}
          </div>
        `;
      }
    });
    
    html += `
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc;">
          ${additionalNotes ? additionalNotes.split('\n').map(line => `<p style="margin: 0 0 4px;">${line}</p>`).join('') : ''}
        </div>
        <div class="footer">
          ZUCA PORTAL SYSTEM
        </div>
      </div>
    </body>
    </html>`;
    return html;
  };

  // Filter schedules
  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.title.toLowerCase().includes(searchTerm.toLowerCase());
    const scheduleYear = schedule.startDate ? new Date(schedule.startDate).getFullYear() : null;
    const matchesYear = yearFilter === "all" || scheduleYear === parseInt(yearFilter);
    return matchesSearch && matchesYear;
  });

  const availableYears = [...new Set(schedules.map(s => 
    s.startDate ? new Date(s.startDate).getFullYear() : null
  ).filter(y => y))].sort((a, b) => b - a);

  const getScheduleStatus = (schedule) => {
    const now = new Date();
    const start = schedule.startDate ? new Date(schedule.startDate) : null;
    const end = schedule.endDate ? new Date(schedule.endDate) : null;
    
    if (end && end < now) return { text: "Completed", color: "#64748b", bg: "#f1f5f9" };
    if (start && start > now) return { text: "Coming Soon", color: "#f59e0b", bg: "#fef3c7" };
    return { text: "Active", color: "#22c55e", bg: "#dcfce7" };
  };

  const goBack = () => navigate(-1);

  const LoadingSpinner = () => (
    <div className="schedules-loader">
      <div className="loader-spinner"></div>
      <p>Loading schedules...</p>
    </div>
  );

  return (
    <div className="user-schedules">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Simple Header - No Dashboard Bar */}
      <div className="schedules-header">
        <button onClick={goBack} className="back-btn">← Back</button>
        <h1><FaCalendarDay></FaCalendarDay> Semester Schedules</h1>
        <p>View and download all published semester schedules</p>
      </div>

      {/* Search and Filter */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search schedules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="filter-select">
          <option value="all">All Years</option>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="count-badge">
        {filteredSchedules.length} schedule{filteredSchedules.length !== 1 ? 's' : ''} found
      </div>

      {/* Schedules Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredSchedules.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p>No schedules found</p>
          <p className="empty-subtext">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="schedules-grid">
          {filteredSchedules.map((schedule, index) => {
            const status = getScheduleStatus(schedule);
            return (
              <motion.div
                key={schedule.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="schedule-card"
                whileHover={{ y: -4 }}
              >
                <div className="card-icon"><FiCalendar></FiCalendar></div>
                <h3>{schedule.title}</h3>
                <div className="card-date">
                  {schedule.startDate && (
                    <span>{new Date(schedule.startDate).toLocaleDateString()} - {new Date(schedule.endDate).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="card-badge" style={{ background: status.bg, color: status.color }}>
                  {status.text}
                </div>
                <div className="card-events"><FiList></FiList> {schedule.events?.length || 0} events</div>
                <motion.button
                  onClick={() => viewSchedule(schedule)}
                  className="view-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FaEye color="#ffffff"/> View Schedule
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <div className="recent-section">
          <h2>🕐 Recently Viewed</h2>
          <div className="recent-list">
            {recentlyViewed.map(schedule => (
              <div key={schedule.id} className="recent-item" onClick={() => viewSchedule(schedule)}>
                <span className="recent-icon">📄</span>
                <span className="recent-title">{schedule.title}</span>
                <span className="recent-date">
                  {schedule.startDate ? new Date(schedule.startDate).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Modal - Opens Fullscreen Automatically */}
      <AnimatePresence>
        {showModal && selectedSchedule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{selectedSchedule.title}</h2>
                <button onClick={closeModal} className="close-btn">✕</button>
              </div>
              
              <div className="modal-body">
                <div className="schedule-content" dangerouslySetInnerHTML={{ 
                  __html: selectedSchedule.content || 
                  buildFullDocumentHTML(selectedSchedule) || 
                  "No content available" 
                }} />
              </div>
              
              <div className="modal-footer">
                <button onClick={() => downloadAsPDF(selectedSchedule)} disabled={downloadLoading} className="download-btn pdf">
                  📄 PDF
                </button>
                <button onClick={() => downloadAsImage(selectedSchedule)} disabled={downloadLoading} className="download-btn image">
                  🖼️ Image
                </button>
                <button onClick={() => downloadAsWord(selectedSchedule)} disabled={downloadLoading} className="download-btn word">
                  📝 Word
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .user-schedules {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
        }

        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 10px;
          color: white;
          z-index: 10000;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideIn 0.3s ease;
        }
        .toast-success { background: #22c55e; }
        .toast-error { background: #ef4444; }
        .toast-info { background: #3b82f6; }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .schedules-header { 
          text-align: center; 
          margin-bottom: 32px;
          position: relative;
        }
        .back-btn {
          position: absolute;
          left: 0;
          top: 0;
          padding: 8px 16px;
          background: black;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .back-btn:hover { background: #f1f5f9; transform: translateX(-2px); }
        .schedules-header h1 { font-size: 32px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
        .schedules-header p { font-size: 14px; color: #64748b; }

        .filter-bar { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; justify-content: center; }
        .search-wrapper { flex: 1; position: relative; max-width: 400px; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 16px; }
        .search-input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          background: white;
        }
        .search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .filter-select { padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; background: white; cursor: pointer; }
        .count-badge { font-size: 13px; color: #64748b; margin-bottom: 20px; text-align: center; }

        .schedules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
          margin-bottom: 48px;
        }
        .schedule-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .schedule-card:hover { box-shadow: 0 12px 24px -8px rgba(0,0,0,0.15); }
        .card-icon { font-size: 40px; margin-bottom: 16px; }
        .schedule-card h3 { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
        .card-date { font-size: 13px; color: #64748b; margin-bottom: 12px; }
        .card-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; margin-bottom: 12px; }
        .card-events { font-size: 13px; color: #64748b; margin-bottom: 16px; }
        .view-btn {
          width: 100%;
          padding: 10px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .view-btn:hover { background: #2563eb; }

        .schedules-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #64748b; }
        .loader-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .empty-state { text-align: center; padding: 60px; background: white; border-radius: 20px; color: #64748b; }
        .empty-icon { font-size: 48px; display: block; margin-bottom: 16px; }
        .empty-subtext { font-size: 13px; margin-top: 8px; }

        .recent-section { margin-top: 32px; padding-top: 32px; border-top: 1px solid #e2e8f0; }
        .recent-section h2 { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 16px; }
        .recent-list { display: flex; flex-direction: column; gap: 8px; }
        .recent-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
        }
        .recent-item:hover { background: #f8fafc; transform: translateX(4px); }
        .recent-icon { font-size: 20px; }
        .recent-title { flex: 1; font-size: 14px; font-weight: 500; color: #1e293b; }
        .recent-date { font-size: 12px; color: #64748b; }

        /* Modal - Fullscreen by default */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.9);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-content {
          background: white;
          display: flex;
          flex-direction: column;
          width: 100vw;
          height: 100vh;
          max-width: 100%;
          max-height: 100%;
          border-radius: 0;
          animation: modalIn 0.3s ease;
          overflow: hidden;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: white;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .modal-header h2 { font-size: 20px; font-weight: 600; color: #1e293b; margin: 0; }
        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #64748b;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .close-btn:hover { background: #fee2e2; color: #ef4444; }
        
        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          background: #f8fafc;
        }
        .schedule-content {
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          max-width: 1000px;
          margin: 0 auto;
        }
        .modal-footer {
          display: flex;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          justify-content: flex-end;
          background: white;
          position: sticky;
          bottom: 0;
        }
        .download-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .download-btn.pdf { background: #ef4444; }
        .download-btn.image { background: #10b981; }
        .download-btn.word { background: #3b82f6; }
        .download-btn:hover { opacity: 0.9; transform: translateY(-2px); }
        .download-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 768px) {
          .user-schedules { padding: 12px; }
          .schedules-header h1 { font-size: 24px; }
          .schedules-header .back-btn { position: relative; margin-bottom: 16px; display: inline-block; }
          .schedules-header { display: flex; flex-direction: column; align-items: center; }
          .schedules-grid { grid-template-columns: 1fr; gap: 16px; }
          .modal-footer { flex-wrap: wrap; }
          .download-btn { flex: 1; text-align: center; }
          .schedule-content { padding: 20px; }
        }
      `}</style>
    </div>
  );
}

export default UserSchedules;