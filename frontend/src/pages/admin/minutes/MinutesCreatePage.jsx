import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Trash2, Calendar, Clock, MapPin, Users, ChevronDown, ChevronUp, ArrowLeft, Save, Eye, Loader, Download, FileText, RefreshCw } from 'lucide-react';
import { api } from '../../../api';
import axios from 'axios';
import BASE_URL from '../../../api';
import { io } from 'socket.io-client';

export default function MinutesCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingSheets, setFetchingSheets] = useState(true);
  const [openingSheet, setOpeningSheet] = useState(false);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [sheetData, setSheetData] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ 0: true });
  const [previewMode, setPreviewMode] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [showDraftsList, setShowDraftsList] = useState(false);
const [draftLoaded, setDraftLoaded] = useState(false);
 const [socket, setSocket] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [liveCheckins, setLiveCheckins] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [syncing, setSyncing] = useState(false);
const [formData, setFormData] = useState({
  attendanceSheetId: '',
  agenda: [''],
  preliminaries: '',
  sections: [{ 
    number: `MIN 02/${String(new Date().getMonth() + 1).padStart(2, '0')}`, 
    title: '', 
    content: '', 
    decisions: ['']
  }],
  aob: [{ title: '', content: '' }],
  adjournment: ''
});
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const DRAFT_KEY_PREFIX = 'minutes_draft_';

  // Load all saved drafts
  const loadSavedDrafts = () => {
    const drafts = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_KEY_PREFIX)) {
        try {
          const draftData = JSON.parse(localStorage.getItem(key));
          if (draftData && draftData.formData) {
            drafts.push({
              key: key,
              timestamp: draftData.timestamp || 0,
              sheetTitle: draftData.sheetData?.title || draftData.formData?.attendanceSheetId || 'Unknown',
              step: draftData.step || 1
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
      
      setFormData(parsed.formData);
      if (parsed.sheetData) setSheetData(parsed.sheetData);
      if (parsed.selectedSheet) setSelectedSheet(parsed.selectedSheet);
      if (parsed.step) setStep(parsed.step);
      if (parsed.expandedSections) setExpandedSections(parsed.expandedSections);
      
      setShowDraftsList(false);
      setDraftLoaded(true);
      alert('✅ Draft loaded successfully!');
    } catch (err) {
      console.error("Error loading draft:", err);
      alert('Failed to load draft');
    }
  };

  // Delete a draft
  const deleteDraft = (draftKey, event) => {
    event.stopPropagation();
    if (window.confirm("Delete this saved draft?")) {
      localStorage.removeItem(draftKey);
      loadSavedDrafts();
      if (savedDrafts.length === 1) {
        setShowDraftsList(false);
      }
    }
  };

  // Clear all drafts
  const clearAllDrafts = () => {
    if (window.confirm("Delete ALL saved drafts?")) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DRAFT_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
      loadSavedDrafts();
      setShowDraftsList(false);
      setDraftLoaded(false);
      alert('All drafts cleared');
    }
  };

  // Save current as draft
  const saveCurrentAsDraft = () => {
    if (step !== 2) {
      alert('Please select an attendance sheet first');
      return;
    }
    const draftKey = `${DRAFT_KEY_PREFIX}${Date.now()}`;
    const draft = {
      formData,
      sheetData,
      selectedSheet,
      step,
      expandedSections,
      timestamp: Date.now()
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
    loadSavedDrafts();
    setDraftLoaded(true);
    alert('✅ Draft saved successfully!');
  };

  // Auto-load the most recent draft when page loads
  const loadMostRecentDraft = () => {
    let newestDraft = null;
    let newestTimestamp = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_KEY_PREFIX)) {
        try {
          const draftData = JSON.parse(localStorage.getItem(key));
          if (draftData && draftData.timestamp > newestTimestamp) {
            newestTimestamp = draftData.timestamp;
            newestDraft = { key, data: draftData };
          }
        } catch (err) {
          console.error("Error parsing draft:", err);
        }
      }
    }
    
    if (newestDraft) {
      const confirmLoad = window.confirm(`You have a saved draft from ${new Date(newestTimestamp).toLocaleString()}. Do you want to restore it?`);
      if (confirmLoad) {
        const parsed = newestDraft.data;
        setFormData(parsed.formData);
        if (parsed.sheetData) setSheetData(parsed.sheetData);
        if (parsed.selectedSheet) setSelectedSheet(parsed.selectedSheet);
        if (parsed.step) setStep(parsed.step);
        if (parsed.expandedSections) setExpandedSections(parsed.expandedSections);
        setDraftLoaded(true);
      }
    }
  };

  // Save draft before page unload (hard refresh, close tab, etc.)
  const saveDraftOnUnload = () => {
    if (step === 2 && formData.attendanceSheetId) {
      const draftKey = `${DRAFT_KEY_PREFIX}auto_${Date.now()}`;
      const draft = {
        formData,
        sheetData,
        selectedSheet,
        step,
        expandedSections,
        timestamp: Date.now()
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      loadSavedDrafts();
    }
  };

  useEffect(() => {
    loadSavedDrafts();
    fetchSheets();
    loadMostRecentDraft();
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', saveDraftOnUnload);
    return () => window.removeEventListener('beforeunload', saveDraftOnUnload);
  }, [formData, sheetData, selectedSheet, step, expandedSections]);

    // ========== WebSocket Connection for Live Updates ==========
  useEffect(() => {
    if (!selectedSheet?.id || step !== 2) return;
    
    console.log(`📡 Connecting to live updates for sheet: ${selectedSheet.id}`);
    
    // Connect to WebSocket
    const socketInstance = io(BASE_URL, {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket']
    });
    
    socketInstance.on('connect', () => {
      console.log('✅ WebSocket connected for live attendance');
      setIsLive(true);
      
      // Join room for this sheet
      socketInstance.emit('join_sheet_room', { sheetId: selectedSheet.id });
      socketInstance.emit('join_minutes_editor', { sheetId: selectedSheet.id });
    });
    
    // Listen for live attendance updates
    socketInstance.on('attendance_live_update', (data) => {
      if (data.sheetId === selectedSheet.id) {
        console.log('🔄 Live attendance update received:', data.newEntry.fullName);
        
        // Update sheetData with new entry
        setSheetData(prev => {
          if (!prev) return prev;
          
          // Check if user already exists
          const alreadyPresent = prev.entries?.some(e => e.userId === data.newEntry.userId);
          if (alreadyPresent) return prev;
          
          // Add to live checkins list
          setLiveCheckins(prevCheckins => [...prevCheckins, data.newEntry]);
          
          // Update entries and remove from absent
          return {
            ...prev,
            entries: [...(prev.entries || []), data.newEntry],
            absentMembers: prev.absentMembers?.filter(m => m.userId !== data.newEntry.userId) || []
          };
        });
        
        setLastUpdate(new Date());
        
        // Show toast notification
        // You can uncomment this if you have toast setup
        // toast.success(`👤 ${data.newEntry.fullName} just checked in!`);
      }
    });
    
    socketInstance.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsLive(false);
    });
    
    setSocket(socketInstance);
    
    return () => {
      if (socketInstance) {
        socketInstance.emit('leave_minutes_editor', { sheetId: selectedSheet.id });
        socketInstance.emit('leave_sheet_room', { sheetId: selectedSheet.id });
        socketInstance.disconnect();
      }
    };
  }, [selectedSheet?.id, step]);

 // ========== Auto-sync attendance every 30 seconds ==========
useEffect(() => {
  // Remove the previewMode check - sync in both views
  if (!formData.attendanceSheetId) return;
  
  const syncInterval = setInterval(() => {
    // Only sync if page is visible
    if (!document.hidden) {
      handleManualSync();
    }
  }, 10000); // 10 seconds
  
  return () => clearInterval(syncInterval);
}, [formData.attendanceSheetId]); // Remove previewMode dependency

  const fetchSheets = async () => {
    setFetchingSheets(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/attendance/all-sheets`, { headers });
      const sheets = response.data.sheets || [];
      const availableSheets = sheets.filter(s => !s.hasMinutes);
      setSheets(availableSheets);
    } catch (error) {
      console.error('Error fetching sheets:', error);
    } finally {
      setFetchingSheets(false);
    }
  };

  const handleSheetSelect = async (sheet) => {
    setOpeningSheet(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/attendance/sheet/${sheet.id}`, { headers });
      setSheetData(response.data.sheet);
      setSelectedSheet(sheet);
      setFormData(prev => ({ ...prev, attendanceSheetId: sheet.id }));
      setStep(2);
    } catch (error) {
      console.error('Error fetching sheet:', error);
      alert('Failed to load attendance sheet. Please try again.');
    } finally {
      setOpeningSheet(false);
    }
  };

  const addSection = () => {
  const currentMonth = new Date().getMonth() + 1; // January = 1, February = 2, etc.
  const monthFormatted = String(currentMonth).padStart(2, '0');
  const newNumber = `MIN ${String(formData.sections.length + 2).padStart(2, '0')}/${monthFormatted}`;
  setFormData(prev => ({
    ...prev,
    sections: [...prev.sections, { number: newNumber, title: '', content: '', decisions: [''] }]
  }));
  setExpandedSections(prev => ({ ...prev, [formData.sections.length]: true }));
};

  const removeSection = (index) => {
    setFormData(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }));
  };

  const updateSection = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const addDecision = (sectionIndex) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === sectionIndex ? { ...s, decisions: [...s.decisions, ''] } : s)
    }));
  };

  const updateDecision = (sectionIndex, decisionIndex, value) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === sectionIndex ? {
        ...s,
        decisions: s.decisions.map((d, j) => j === decisionIndex ? value : d)
      } : s)
    }));
  };

  const addAgenda = () => {
    setFormData(prev => ({ ...prev, agenda: [...prev.agenda, ''] }));
  };

  const updateAgenda = (index, value) => {
    setFormData(prev => ({ ...prev, agenda: prev.agenda.map((a, i) => i === index ? value : a) }));
  };

  const addAOB = () => {
    setFormData(prev => ({ ...prev, aob: [...prev.aob, { title: '', content: '' }] }));
  };

  const updateAOB = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      aob: prev.aob.map((a, i) => i === index ? { ...a, [field]: value } : a)
    }));
  };

 const handleSubmit = async () => {
  setLoading(true);
  try {
    // Define presentMembersWithRoles here
    const presentMembersWithRoles = sheetData?.entries?.filter(entry => entry.userId).map(entry => ({
      userId: entry.userId,
      fullName: entry.fullName,
      executivePosition: entry.executivePosition || null
    })) || [];

    const submitData = {
      attendanceSheetId: formData.attendanceSheetId,
      presentMembers: presentMembersWithRoles,  // Now defined!
      agenda: formData.agenda.filter(a => a.trim()),
      preliminaries: formData.preliminaries,
      sections: formData.sections.filter(s => s.title.trim()).map(s => ({
        number: s.number,
        title: s.title,
        content: s.content,
        decisions: s.decisions.filter(d => d.trim())
      })),
      aob: formData.aob.filter(a => a.title.trim() || a.content.trim()),
      adjournment: formData.adjournment
    };

    await api.post('/api/minutes', submitData, { headers });
    navigate(-1);
  } catch (error) {
    console.error('Error creating minutes:', error);
    alert('Failed to create minutes. Please try again.');
  } finally {
    setLoading(false);
  }
};


  // ========== Manual Sync Function ==========
  const handleManualSync = async () => {
    if (!formData.attendanceSheetId) return;
    
    setSyncing(true);
    try {
      const response = await axios.get(
        `${BASE_URL}/api/attendance/sheet/${formData.attendanceSheetId}`,
        { headers }
      );
      
      if (response.data.success) {
        setSheetData(response.data.sheet);
        setLastUpdate(new Date());
        // alert('✅ Attendance synced successfully');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync attendance');
    } finally {
      setSyncing(false);
    }
  };

  

  // Loading state for step 1
  if (step === 1 && fetchingSheets) {
    return (
      <div className="create-minutes-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back to Minutes
          </button>
          <h1>Create Meeting Minutes</h1>
        </div>
        <div className="loading-container">
          <Loader size={48} className="spin" />
          <p>Loading attendance sheets...</p>
        </div>
        <style>{`
          .create-minutes-page { max-width: 1200px; margin: 0 auto; padding: 24px; background: #f8fafc; min-height: 100vh; }
          .page-header { display: flex; align-items: center; gap: 20px; margin-bottom: 32px; }
          .back-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; color: #1e293b; }
          .page-header h1 { margin: 0; font-size: 24px; font-weight: 700; color: #0f172a; }
          .loading-container { text-align: center; padding: 80px; background: white; border-radius: 20px; }
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="create-minutes-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back to Minutes
          </button>
          <h1>Create Meeting Minutes</h1>
          <div className="header-actions">
            <button className="btn-icon" onClick={() => { loadSavedDrafts(); setShowDraftsList(!showDraftsList); }} title="Saved Drafts" style={{ position: 'relative' }}>
              <FileText size={18} />
              {savedDrafts.length > 0 && <span className="draft-badge">{savedDrafts.length}</span>}
            </button>
          </div>
        </div>

        {draftLoaded && (
          <div className="draft-indicator">
            <Clock size={14} />
            <span>Draft restored from previous session</span>
            <button onClick={() => { clearAllDrafts(); setDraftLoaded(false); }}>Clear</button>
          </div>
        )}

        {showDraftsList && (
          <div className="drafts-panel">
            <div className="drafts-header">
              <h3><FileText size={16} /> Saved Drafts</h3>
              <button className="close-drafts" onClick={() => setShowDraftsList(false)}><X size={18} /></button>
            </div>
            {savedDrafts.length === 0 ? (
              <div className="no-drafts"><p>No saved drafts found</p><small>Save a draft while creating minutes</small></div>
            ) : (
              <>
                <div className="drafts-list">
                  {savedDrafts.map((draft) => (
                    <div key={draft.key} className="draft-item" onClick={() => loadSpecificDraft(draft.key)}>
                      <div className="draft-info">
                        <div className="draft-title"><Calendar size={14} /> {draft.sheetTitle}</div>
                        <div className="draft-meta"><Clock size={14} /> {new Date(draft.timestamp).toLocaleString()}</div>
                        <div className="draft-step">Step: {draft.step === 1 ? 'Select Sheet' : 'Fill Details'}</div>
                      </div>
                      <button className="delete-draft-btn" onClick={(e) => deleteDraft(draft.key, e)}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
                <div className="drafts-footer"><button className="clear-all-drafts" onClick={clearAllDrafts}>Clear All Drafts</button></div>
              </>
            )}
          </div>
        )}

        <div className="sheets-container">
          <h2>Select Attendance Sheet</h2>
          <p className="subtitle">Choose an attendance sheet to create minutes from</p>
          {sheets.length === 0 ? (
            <div className="empty-state"><Users size={48} /><p>No attendance sheets available</p><small>Please create an attendance sheet first</small><button onClick={() => navigate('/secretary/attendance')} className="create-sheet-btn">+ Create Attendance Sheet</button></div>
          ) : (
            <div className="sheets-grid">
              {sheets.map(sheet => (
                <div key={sheet.id} className="sheet-card" onClick={() => handleSheetSelect(sheet)}>
                  <div className="sheet-header"><h3>{sheet.title}</h3><span className="present-count"> {sheet.entries?.length || 0} </span></div>
                  <div className="sheet-details"><span><Calendar size={14} /> {new Date(sheet.eventDate).toLocaleDateString()}</span><span><Clock size={14} /> {sheet.eventTime || '4:30 PM'}</span><span><MapPin size={14} /> {sheet.location || 'ZUCA'}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
        {openingSheet && (<div className="loading-overlay"><div className="loading-popup"><Loader size={40} className="spin" /><p>Loading attendance data...</p></div></div>)}

        <style>{`
          .create-minutes-page { max-width: 1200px; margin: 0 auto; padding: 24px; background: #f8fafc; min-height: 100vh; }
          .page-header { display: flex; align-items: center; gap: 20px; margin-bottom: 32px; flex-wrap: wrap; }
          .back-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; color: #1e293b; }
          .page-header h1 { margin: 0; font-size: 24px; font-weight: 700; color: #0f172a; }
          .header-actions { margin-left: auto; }
          .btn-icon { position: relative; background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: #475569; }
          .draft-badge { position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 10px; min-width: 18px; text-align: center; }
          .draft-indicator { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #fef3c7; border-radius: 10px; margin-bottom: 20px; font-size: 13px; color: #d97706; }
          .draft-indicator button { background: none; border: none; color: #d97706; cursor: pointer; text-decoration: underline; margin-left: auto; }
          .drafts-panel { background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); margin-bottom: 20px; overflow: hidden; }
          .drafts-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
          .drafts-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 8px; }
          .close-drafts { background: none; border: none; cursor: pointer; color: #64748b; padding: 4px; border-radius: 8px; }
          .drafts-list { max-height: 400px; overflow-y: auto; }
          .draft-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: all 0.2s; }
          .draft-item:hover { background: #eff6ff; }
          .draft-info { flex: 1; }
          .draft-title, .draft-meta, .draft-step { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; }
          .draft-title { color: #0f172a; font-weight: 500; }
          .draft-meta { color: #94a3b8; font-size: 11px; margin-bottom: 0; }
          .draft-step { color: #64748b; font-size: 11px; }
          .delete-draft-btn { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 8px; border-radius: 8px; }
          .delete-draft-btn:hover { background: #fef2f2; color: #dc2626; }
          .no-drafts { text-align: center; padding: 40px 20px; color: #94a3b8; }
          .drafts-footer { padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: right; }
          .clear-all-drafts { background: none; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 8px; font-size: 12px; color: #dc2626; cursor: pointer; }
          .sheets-container h2 { font-size: 18px; margin-bottom: 8px; }
          .subtitle { color: #64748b; margin-bottom: 24px; }
          .sheets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }
          .sheet-card { background: white; border-radius: 16px; padding: 20px; cursor: pointer; transition: all 0.2s; border: 1px solid #e2e8f0; }
          .sheet-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); border-color: #3b82f6; }
          .sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
          .sheet-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
          .present-count { font-size: 12px; color: #49574e00; background: #00000000; padding: 4px 10px; border-radius: 20px; }
          .sheet-details { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: #64748b; }
          .empty-state { text-align: center; padding: 60px; background: white; border-radius: 20px; border: 2px dashed #e2e8f0; }
          .create-sheet-btn { margin-top: 16px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 10px; cursor: pointer; }
          .loading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
          .loading-popup { background: white; border-radius: 20px; padding: 30px 40px; text-align: center; }
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @media (max-width: 768px) { .create-minutes-page { padding: 16px; } .sheets-grid { grid-template-columns: 1fr; } .page-header { flex-direction: column; align-items: flex-start; } .header-actions { margin-left: 0; } }
        `}</style>
      </div>
    );
  }

  // STEP 2 - Form
  return (
    <div className="create-minutes-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => setStep(1)}><ArrowLeft size={18} /> Back to Sheets</button>
        <h1>Create Meeting Minutes</h1>
        <div className="header-actions">
          <button className="save-draft-btn" onClick={saveCurrentAsDraft}><Save size={16} /> Save Draft</button>
          <button className="preview-btn" onClick={() => setPreviewMode(!previewMode)}><Eye size={16} /> {previewMode ? 'Edit' : 'Preview'}</button>
          <button className="submit-btn" onClick={handleSubmit} disabled={loading}>{loading ? <><Loader size={16} className="spin" /> Saving...</> : <><Save size={16} /> Save Minutes</>}</button>
        </div>
      </div>

      {draftLoaded && (
        <div className="draft-indicator" style={{ marginBottom: '20px' }}>
          <Clock size={14} />
          <span>Draft loaded - continue where you left off</span>
          <button onClick={() => { clearAllDrafts(); setDraftLoaded(false); }}>Clear</button>
        </div>
      )}

      {loading && (<div className="loading-overlay"><div className="loading-popup"><Loader size={40} className="spin" /><p>Creating minutes...</p></div></div>)}

          {previewMode ? (
        <div className="preview-container">
          {/* Live Indicator */}
          <div className="preview-live-indicator">
            <div className="live-status">
              <span className={`live-dot ${isLive ? 'active' : 'inactive'}`}></span>
              <span className="live-label">{isLive ? '🔴 LIVE' : '⏸️ Paused'}</span>
              <span className="live-count">👥 {sheetData?.entries?.length || 0} checked in</span>
              {lastUpdate && (
                <span className="live-time">Updated: {lastUpdate.toLocaleTimeString()}</span>
              )}
              {liveCheckins.length > 0 && (
                <span className="live-new">+{liveCheckins.length} new</span>
              )}
            </div>
            <div className="live-actions">
              <button 
                className="sync-btn" 
                onClick={handleManualSync}
                disabled={syncing}
              >
                <RefreshCw size={14} className={syncing ? 'spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>
          
          <div className="preview-header"><h1>MINUTES OF MEETING HELD ON {new Date(sheetData?.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()} AT {sheetData?.location?.toUpperCase() || 'THE COMPLEX BUILDING'} AT {sheetData?.eventTime || '1850HRS'}</h1></div>
        <div className="preview-section">
  <h2>Members present</h2>
  {(() => {
    const getPositionRank = (position) => {
      const hierarchy = {
        'Chairperson': 1,
        'Vice Chairperson': 2,
        'Secretary': 3,
        'Vice Secretary': 4,
        'Treasurer': 5,
        'Organising Secretary': 6,
        'Choir Moderator': 7,
        'Vice Choir Moderator': 8,
        'Media Moderator': 9,
        'St. Gregory Moderator': 10,
        'St. Peregrine Moderator': 11,
        'Welfare': 12,
        'ALTO Voice Rep': 13,
        'Member': 99
      };
      return hierarchy[position] || 98;
    };

    const allPresent = sheetData?.entries?.filter(entry => entry.userId) || [];
    
    const executives = allPresent.filter(m => 
      m.executivePosition && m.executivePosition !== 'Member'
    );
    
    const sortedExecutives = [...executives].sort((a, b) => {
      const roleA = a.executivePosition || 'Member';
      const roleB = b.executivePosition || 'Member';
      return getPositionRank(roleA) - getPositionRank(roleB);
    });

    return sortedExecutives.map((member, idx) => {
      let displayRole = member.executivePosition || 'Member';
      return (
        <div key={member.userId || idx}>
          {idx + 1}. {member.fullName} ({displayRole})
        </div>
      );
    });
  })()}
</div>

{(() => {
  const allPresent = sheetData?.entries?.filter(entry => entry.userId) || [];
  const regularMembers = allPresent.filter(m => 
    !m.executivePosition || m.executivePosition === 'Member'
  );
  const guests = sheetData?.presentGuests || [];
  const inAttendance = [...regularMembers, ...guests];
  
  if (inAttendance.length === 0) return null;
  
  return (
    <div className="preview-section">
      <h2>In-Attendance</h2>
      {inAttendance.map((member, idx) => {
        let displayName = member.fullName;
        let displayRole = member.role || 'Member';
        if (member.role === 'Guest' || member.role === 'guest') {
          displayRole = '';
        }
        return (
          <div key={member.userId || idx}>
            {idx + 1}. {displayName}{displayRole ? ` (${displayRole})` : ''}
          </div>
        );
      })}
    </div>
  );
})()}
         {/* All Absent Members */}
{sheetData?.absentMembers?.length > 0 && (
  <div className="preview-section">
    <h2>Absent Members</h2>
    {sheetData.absentMembers.map((member, idx) => {
      let displayRole = member.executivePosition || null;
      return (
        <div key={idx}>
          {idx + 1}. {member.fullName}
          {displayRole && ` (${displayRole})`}
          {member.excused && ` (Excused)`}
        </div>
      );
    })}
  </div>
)}

{/* Absent with Apology (only excused members) */}
{sheetData?.absentMembers?.filter(m => m.excused).length > 0 && (
  <div className="preview-section">
    <h2>Absent with Apology</h2>
    {sheetData.absentMembers.filter(m => m.excused).map((member, idx) => (
      <div key={idx}>{idx + 1}. {member.fullName}</div>
    ))}
  </div>
)}
          {sheetData?.presentGuests?.length > 0 && (<div className="preview-section"><h2>In-Attendance</h2>{sheetData.presentGuests.map((guest, idx) => (<div key={idx}>{idx + 1}. {guest.fullName}</div>))}</div>)}
          <div className="preview-section"><h2>Agenda</h2>{formData.agenda.filter(a => a.trim()).map((item, idx) => (<div key={idx}>{idx + 1}. {item}</div>))}</div>
          {formData.preliminaries && (<div className="preview-section"><h2>MIN 01/{String(new Date().getMonth() + 1).padStart(2, '0')}: PRELIMINARIES</h2><p>{formData.preliminaries}</p></div>)}
          {formData.sections.filter(s => s.title.trim()).map((section, idx) => (<div key={idx} className="preview-section"><h2>{section.number}: {section.title}</h2><p>{section.content}</p>{section.decisions.filter(d => d.trim()).length > 0 && (<div className="preview-decisions"><strong>Decisions:</strong><ul>{section.decisions.filter(d => d.trim()).map((d, i) => <li key={i}>{d}</li>)}</ul></div>)}</div>))}
        {formData.aob.filter(a => a.title.trim()).length > 0 && (<div className="preview-section"><h2>MIN {String((formData.sections.filter(s => s.title.trim()).length || 0) + 2).padStart(2, '0')}/{String(new Date().getMonth() + 1).padStart(2, '0')}: AOB</h2>{formData.aob.filter(a => a.title.trim()).map((item, idx) => (<div key={idx}><strong>{item.title}</strong>{item.content && <p>{item.content}</p>}</div>))}</div>)}
         {formData.adjournment && (<div className="preview-section"><h2>MIN {String((formData.sections.filter(s => s.title.trim()).length || 0) + (formData.aob.filter(a => a.title.trim()).length > 0 ? 3 : 2)).padStart(2, '0')}/{String(new Date().getMonth() + 1).padStart(2, '0')}: ADJOURNMENT</h2><p>{formData.adjournment}</p></div>)}
          <div className="preview-signatures"><div>Date _________________</div><div>Chairperson _________________</div><div>Secretary _________________</div></div>
        </div>
          ) : (
        <>
          {/* Live Indicator for Edit View */}
          <div className="edit-live-indicator">
            <div className="live-status">
              <span className={`live-dot ${isLive ? 'active' : 'inactive'}`}></span>
              <span className="live-label">{isLive ? '🔴 LIVE' : '⏸️ Paused'}</span>
              <span className="live-count">👥 {sheetData?.entries?.length || 0} checked in</span>
              {lastUpdate && (
                <span className="live-time">Updated: {lastUpdate.toLocaleTimeString()}</span>
              )}
              {liveCheckins.length > 0 && (
                <span className="live-new">+{liveCheckins.length} new</span>
              )}
            </div>
            <div className="live-actions">
              <button 
                className="sync-btn" 
                onClick={handleManualSync}
                disabled={syncing}
              >
                <RefreshCw size={14} className={syncing ? 'spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>

          <div className="meeting-info-card">
            <h3>{sheetData?.title}</h3>
            <div className="info-meta"><span><Calendar size={14} /> {new Date(sheetData?.eventDate).toLocaleDateString()}</span><span><Clock size={14} /> {sheetData?.eventTime || '4:30 PM'}</span><span><MapPin size={14} /> {sheetData?.location || 'ZUCA'}</span></div>
            <details className="attendance-summary">
              <summary>📋 Attendance ({sheetData?.entries?.length || 0} present, {sheetData?.absentMembers?.length || 0} absent)</summary>
              <div className="present-list">
                <strong>Present:</strong> {sheetData?.entries?.map(e => e.fullName).join(', ') || 'None yet'}
              </div>
              <div className="absent-list">
                <strong>Absent:</strong> {sheetData?.absentMembers?.map(m => m.fullName).join(', ') || 'None'}
              </div>
            </details>
          </div>

          <div className="form-section"><label>Agenda Items</label>{formData.agenda.map((item, idx) => (<div key={idx} className="array-item"><textarea value={item} onChange={(e) => updateAgenda(idx, e.target.value)} placeholder={`Item ${idx + 1}`} rows={2} className="agenda-textarea" />{idx === formData.agenda.length - 1 && (<button type="button" className="add-btn" onClick={addAgenda}><Plus size={16} /></button>)}</div>))}</div>

          <div className="form-section"><label>Preliminaries (Opening prayer, who chaired)</label><textarea value={formData.preliminaries} onChange={(e) => setFormData(prev => ({ ...prev, preliminaries: e.target.value }))} placeholder="The meeting was opened with a word of prayer from..." rows="5" className="large-textarea" /></div>

          <div className="form-section"><div className="section-header-label"><label>Minutes Sections</label><button type="button" className="add-section-btn" onClick={addSection}><Plus size={16} /> Add Section</button></div>
            {formData.sections.map((section, idx) => (<div key={idx} className="section-card"><div className="section-header" onClick={() => setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }))}><span>{section.number}</span><div className="section-actions"><button type="button" className="remove-btn" onClick={(e) => { e.stopPropagation(); removeSection(idx); }}><Trash2 size={14} /></button><ChevronDown size={16} className={expandedSections[idx] ? 'rotate' : ''} /></div></div>
              {expandedSections[idx] && (<div className="section-content"><input type="text" placeholder="Section Title (e.g., REVIEW OF ACTIVITIES)" value={section.title} onChange={(e) => updateSection(idx, 'title', e.target.value)} className="section-title-input" /><textarea placeholder="Discussion content..." value={section.content} onChange={(e) => updateSection(idx, 'content', e.target.value)} rows="6" className="section-content-textarea" /><div className="sub-section"><label>Decisions Made</label>{section.decisions.map((decision, dIdx) => (<div key={dIdx} className="array-item"><textarea value={decision} onChange={(e) => updateDecision(idx, dIdx, e.target.value)} placeholder={`Decision ${dIdx + 1}`} rows={2} className="decision-textarea" />{dIdx === section.decisions.length - 1 && (<button type="button" className="add-btn" onClick={() => addDecision(idx)}><Plus size={14} /></button>)}</div>))}</div></div>)}</div>))}
          </div>

          <div className="form-section"><div className="section-header-label"><label>Any Other Business (AOB)</label><button type="button" className="add-section-btn" onClick={addAOB}><Plus size={16} /> Add AOB</button></div>
            {formData.aob.map((item, idx) => (<div key={idx} className="aob-card"><input type="text" placeholder="Topic" value={item.title} onChange={(e) => updateAOB(idx, 'title', e.target.value)} className="aob-title-input" /><textarea placeholder="Details" value={item.content} onChange={(e) => updateAOB(idx, 'content', e.target.value)} rows="3" className="aob-content-textarea" />{formData.aob.length > 1 && (<button type="button" className="remove-aob" onClick={() => setFormData(prev => ({ ...prev, aob: prev.aob.filter((_, i) => i !== idx) }))}><Trash2 size={14} /></button>)}</div>))}
          </div>

          <div className="form-section"><label>Adjournment</label><textarea value={formData.adjournment} onChange={(e) => setFormData(prev => ({ ...prev, adjournment: e.target.value }))} placeholder="The meeting was closed by... with a prayer from..." rows="3" className="large-textarea" /></div>

          <div className="form-actions"><button className="cancel-btn" onClick={() => navigate(-1)}>Cancel</button><button className="submit-btn" onClick={handleSubmit} disabled={loading}>{loading ? 'Creating...' : 'Create Minutes'}</button></div>
        </>
      )}

      <style>{`
        .create-minutes-page { padding: 24px; background: #f8fafc; min-height: 100vh; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .back-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; color: #1e293b; }
        .page-header h1 { margin: 0; font-size: 24px; font-weight: 700; color: #0f172a; }
        .header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .save-draft-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; background: #fef3c7; color: #d97706; }
        .preview-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; background: #f1f5f9; color: #1e293b; }
        .submit-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; background: #1a1a1a; color: white; }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .draft-indicator { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #fef3c7; border-radius: 10px; margin-bottom: 20px; font-size: 13px; color: #d97706; }
        .draft-indicator button { background: none; border: none; color: #d97706; cursor: pointer; text-decoration: underline; margin-left: auto; }
        .meeting-info-card { background: white; border-radius: 16px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
        .meeting-info-card h3 { margin: 0 0 12px; font-size: 18px; }
        .info-meta { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; font-size: 13px; color: #64748b; }
        .info-meta span { display: flex; align-items: center; gap: 6px; }
        .attendance-summary { cursor: pointer; }
        .attendance-summary summary { font-weight: 500; margin-bottom: 8px; }
        .present-list, .absent-list { font-size: 13px; margin: 4px 0; }
        .form-section { background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
        .form-section label { display: block; font-weight: 600; margin-bottom: 12px; font-size: 14px; color: #0f172a; }
        .agenda-textarea, .decision-textarea { width: 100%; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-family: inherit; resize: vertical; background: white; }
        .large-textarea { width: 100%; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-family: inherit; resize: vertical; min-height: 120px; }
        .section-title-input { width: 100%; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-weight: 500; margin-bottom: 16px; }
        .section-content-textarea { width: 100%; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-family: inherit; resize: vertical; min-height: 150px; }
        .aob-title-input { width: 100%; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-weight: 500; margin-bottom: 12px; }
        .aob-content-textarea { width: 100%; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; font-family: inherit; resize: vertical; min-height: 100px; }
        .array-item { display: flex; gap: 10px; margin-bottom: 10px; }
        .array-item textarea { flex: 1; }
        .add-btn { background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; padding: 0 16px; display: flex; align-items: center; }
        .section-header-label { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .add-section-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; }
        .section-card { border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
        .section-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #f8fafc; cursor: pointer; font-weight: 500; }
        .section-actions { display: flex; align-items: center; gap: 12px; }
        .remove-btn { background: none; border: none; cursor: pointer; color: #ef4444; }
        .rotate { transform: rotate(180deg); }
        .section-content { padding: 16px; border-top: 1px solid #e2e8f0; }
        .sub-section { margin-top: 16px; padding-top: 12px; border-top: 1px dashed #e2e8f0; }
        .aob-card { position: relative; padding: 16px; background: #f8fafc; border-radius: 12px; margin-bottom: 12px; }
        .aob-card input, .aob-card textarea { margin-bottom: 10px; }
        .remove-aob { position: absolute; top: 12px; right: 12px; background: none; border: none; cursor: pointer; color: #ef4444; }
        .form-actions { display: flex; justify-content: flex-end; gap: 16px; margin-top: 24px; }
        .cancel-btn { padding: 12px 24px; background: #f1f5f9; border: none; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; }
        .loading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .loading-popup { background: white; border-radius: 20px; padding: 30px 40px; text-align: center; }
        .preview-container { background: white; border-radius: 16px; padding: 30px; border: 1px solid #e2e8f0; }
        .preview-header h1 { text-align: center; font-size: 14px; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #1a1a1a; }
        .preview-section { margin-bottom: 24px; }
        .preview-section h2 { font-size: 14px; font-weight: 700; margin-bottom: 8px; text-decoration: underline; }
        .preview-section p { font-size: 13px; line-height: 1.5; }
        .preview-decisions { margin-top: 10px; padding-left: 20px; }
        .preview-decisions ul { margin: 5px 0; padding-left: 20px; }
        .preview-signatures { margin-top: 50px; display: flex; justify-content: space-between; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .create-minutes-page { padding: 16px; } .page-header { flex-direction: column; align-items: stretch; } .header-actions { justify-content: flex-end; } .form-actions { flex-direction: column; } .cancel-btn, .submit-btn { width: 100%; justify-content: center; } .preview-signatures { flex-direction: column; gap: 16px; } .agenda-textarea, .decision-textarea, .large-textarea, .section-content-textarea, .aob-content-textarea { font-size: 16px; } }

                /* Live indicator styles */
        .preview-live-indicator {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #f8fafc;
          border-radius: 12px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
          flex-wrap: wrap;
          gap: 12px;
        }
        
        .live-status {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .live-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }
        
        .live-dot.active {
          background: #22c55e;
          animation: pulse 1.5s infinite;
        }
        
        .live-dot.inactive {
          background: #94a3b8;
        }
        
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        .live-label {
          font-weight: 600;
          font-size: 13px;
        }
        
        .live-label:has(.active) {
          color: #22c55e;
        }
        
        .live-count {
          font-size: 13px;
          color: #1e293b;
          font-weight: 500;
        }
        
        .live-time {
          font-size: 12px;
          color: #94a3b8;
        }
        
        .live-new {
          background: #3b82f6;
          color: white;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          animation: fadeIn 0.5s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .live-actions {
          display: flex;
          gap: 8px;
        }
        
        .sync-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          color: #475569;
          transition: all 0.2s;
        }
        
        .sync-btn:hover {
          background: #f1f5f9;
          border-color: #3b82f6;
        }
        
        .sync-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }

                /* Edit view live indicator */
        .edit-live-indicator {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          background: #f8fafc;
          border-radius: 12px;
          margin-bottom: 16px;
          border: 1px solid #e2e8f0;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .edit-live-indicator .live-status {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .edit-live-indicator .live-count {
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
        }
        
        .edit-live-indicator .live-new {
          background: #3b82f6;
          color: white;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .edit-live-indicator .sync-btn {
          padding: 4px 12px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}