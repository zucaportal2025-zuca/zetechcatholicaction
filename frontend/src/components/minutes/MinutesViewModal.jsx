import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, MapPin, CheckCircle, XCircle, MessageCircle, Users, Download, FileText, File, Loader } from 'lucide-react';
import { api } from '../../api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function MinutesViewModal({ minutesId, onClose, onRefresh }) {
  const [minutes, setMinutes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('minutes');
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const minutesRef = useRef(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchMinutes();
  }, [minutesId]);

  const fetchMinutes = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/minutes/${minutesId}`, { headers });
      setMinutes(response.data.minutes);
    } catch (error) {
      console.error('Error fetching minutes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      await api.post(`/api/minutes/${minutesId}/comment`, { comment }, { headers });
      setComment('');
      await fetchMinutes();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSendingComment(false);
    }
  };

  const downloadAsPDF = async () => {
    if (downloading || !minutesRef.current) return;
    setDownloading(true);
    try {
      const element = minutesRef.current;
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${minutes?.title || 'meeting-minutes'}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const downloadAsWord = () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const content = `
        <html>
        <head><meta charset="UTF-8"><title>${minutes?.title || 'Meeting Minutes'}</title>
        <style>
          body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
          h1 { text-align: center; font-size: 18pt; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin: 20px 0; }
          .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
        </style>
        </head>
        <body>
          <h1>${minutes?.title || ''}</h1>
          <div class="header">
            <p>Date: ${minutes?.meetingDate ? new Date(minutes.meetingDate).toLocaleDateString() : ''} | Time: ${minutes?.meetingTime || '4:30 PM'}</p>
            <p>Venue: ${minutes?.venue || 'ZUCA'}</p>
          </div>
          <div class="section"><strong>MEMBERS PRESENT:</strong> ${minutes?.presentMembers?.map(m => m.fullName).join(', ') || 'None'}</div>
          <div class="section"><strong>MEMBERS ABSENT:</strong> ${minutes?.absentMembers?.map(m => m.fullName).join(', ') || 'None'}</div>
          <div class="section"><strong>AGENDA:</strong><ol>${minutes?.agenda?.map(i => `<li>${i}</li>`).join('') || 'None'}</ol></div>
          <div class="section"><strong>MINUTES:</strong> ${minutes?.sections?.map(s => `<p><b>${s.number}: ${s.title}</b><br/>${s.content}</p>`).join('') || ''}</div>
          <div class="signatures"><div>Chairperson: _________________</div><div>Secretary: _________________</div></div>
          <p style="text-align: center;">ZUCA PORTAL SYSTEM GENERATED</p>
        </body>
        </html>
      `;
      const blob = new Blob([content], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${minutes?.title || 'meeting-minutes'}.doc`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Word generation error:', error);
    } finally {
      setDownloading(false);
    }
  };

  // Loading State - prevents multiple clicks
  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container loading">
          <div className="loading-spinner">
            <Loader size={40} className="spin" />
            <p>Loading minutes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!minutes) return null;

  const isCreator = minutes.createdBy === user.id;
  const isPublished = minutes.status === 'APPROVED';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container large" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2>{minutes.title}</h2>
            <div className="sheet-meta">
              <span><Calendar size={14} /> {new Date(minutes.meetingDate).toLocaleDateString()}</span>
              <span><Clock size={14} /> {minutes.meetingTime || '4:30 PM'}</span>
              <span><MapPin size={14} /> {minutes.venue || 'ZUCA'}</span>
              <span className={`status ${minutes.status === 'APPROVED' ? 'approved' : 'draft'}`}>
                {minutes.status === 'APPROVED' ? '● APPROVED' : '● DRAFT'}
              </span>
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-btn download" onClick={downloadAsPDF} disabled={downloading} title="Download PDF">
              {downloading ? <Loader size={16} className="spin" /> : <FileText size={18} />}
            </button>
            <button className="icon-btn download" onClick={downloadAsWord} disabled={downloading} title="Download Word">
              <File size={18} />
            </button>
            <button className="close-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${activeTab === 'minutes' ? 'active' : ''}`} onClick={() => setActiveTab('minutes')}>
            📄 Minutes
          </button>
          <button className={`tab ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
            👥 Attendance
          </button>
          <button className={`tab ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>
            💬 Comments ({minutes.comments?.length || 0})
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {/* MINUTES TAB */}
          {activeTab === 'minutes' && (
            <div ref={minutesRef} className="minutes-content">
              <div className="print-header">
                <h1 className="print-title">{minutes.title}</h1>
                <div className="print-meta">
                  <p>Date: {new Date(minutes.meetingDate).toLocaleDateString()}</p>
                  <p>Time: {minutes.meetingTime || '4:30 PM'}</p>
                  <p>Venue: {minutes.venue || 'ZUCA'}</p>
                </div>
              </div>

              {/* Present Members */}
              <div className="info-card">
                <h4>MEMBERS PRESENT ({minutes.presentMembers?.length || 0})</h4>
                <div className="members-grid">
                  {minutes.presentMembers?.map((m, idx) => (
                    <div key={idx} className="member-item">
                      <span>{idx + 1}. {m.fullName}</span>
                      {m.role && <span className="role-badge">{m.role}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Absent with Excuses */}
              {minutes.absentMembers?.filter(m => m.excused).length > 0 && (
                <div className="info-card">
                  <h4>ABSENT WITH APOLOGY</h4>
                  {minutes.absentMembers.filter(m => m.excused).map((m, idx) => (
                    <div key={idx} className="excuse-item">
                      <span>{m.fullName}</span>
                      <span className="excuse-reason">— {m.excuse || 'Excused'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Guests */}
              {minutes.presentGuests?.length > 0 && (
                <div className="info-card">
                  <h4>IN-ATTENDANCE (Guests)</h4>
                  {minutes.presentGuests.map((g, idx) => <div key={idx}>{g.fullName}</div>)}
                </div>
              )}

              {/* Agenda */}
              {minutes.agenda?.length > 0 && (
                <div className="info-card">
                  <h4>AGENDA</h4>
                  <ol>{minutes.agenda.map((item, idx) => <li key={idx}>{item}</li>)}</ol>
                </div>
              )}

              {/* Preliminaries */}
              {minutes.preliminaries && (
                <div className="info-card">
                  <h4>PRELIMINARIES</h4>
                  <p>{minutes.preliminaries}</p>
                </div>
              )}

              {/* Sections */}
              {minutes.sections?.map((section, idx) => (
                <div key={idx} className="info-card">
                  <h4>{section.number}: {section.title}</h4>
                  <p>{section.content}</p>
                  {section.decisions?.length > 0 && (
                    <>
                      <h5>DECISIONS:</h5>
                      <ul>{section.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
                    </>
                  )}
                </div>
              ))}

              {/* AOB */}
              {minutes.aob?.length > 0 && (
                <div className="info-card">
                  <h4>AOB</h4>
                  {minutes.aob.map((item, idx) => (
                    <div key={idx}>
                      <strong>{item.title}</strong>
                      <p>{item.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Adjournment */}
              {minutes.adjournment && (
                <div className="info-card">
                  <h4>ADJOURNMENT</h4>
                  <p>{minutes.adjournment}</p>
                </div>
              )}

              {/* Signatures */}
              <div className="signatures">
                <div className="signature-line">
                  <span>Chairperson</span>
                  <span className="signature-placeholder">_________________</span>
                  <span>Date: _________</span>
                </div>
                <div className="signature-line">
                  <span>Secretary</span>
                  <span className="signature-placeholder">_________________</span>
                  <span>Date: _________</span>
                </div>
              </div>
              <div className="print-footer">ZUCA PORTAL SYSTEM GENERATED</div>
            </div>
          )}

          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div>
              <div className="stats-summary">
                <div className="stat">✅ Present: {minutes.presentMembers?.length || 0}</div>
                <div className="stat">❌ Absent: {minutes.absentMembers?.length || 0}</div>
                <div className="stat">👥 Guests: {minutes.presentGuests?.length || 0}</div>
              </div>
              
              <details>
                <summary>Present Members ({minutes.presentMembers?.length || 0})</summary>
                <div className="members-grid">
                  {minutes.presentMembers?.map((m, idx) => (
                    <div key={idx} className="member-item">{m.fullName} {m.role && <span className="role-badge">{m.role}</span>}</div>
                  ))}
                </div>
              </details>

              <details>
                <summary>Absent Members ({minutes.absentMembers?.length || 0})</summary>
                {minutes.absentMembers?.map((m, idx) => (
                  <div key={idx} className="absent-item">
                    <span>{m.fullName}</span>
                    {m.excuse && <span className="excuse">— {m.excuse}</span>}
                    {m.excused && <span className="excused-badge">Excused</span>}
                  </div>
                ))}
              </details>
            </div>
          )}

          {/* COMMENTS TAB */}
          {activeTab === 'comments' && (
            <div>
              <div className="comments-list">
                {minutes.comments?.length === 0 ? (
                  <div className="empty-state">No comments yet</div>
                ) : (
                  minutes.comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-avatar">{comment.user?.fullName?.[0] || 'U'}</div>
                      <div className="comment-content">
                        <div className="comment-header">
                          <strong>{comment.user?.fullName || 'Unknown'}</strong>
                          <span>{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p>{comment.comment}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="comment-input">
                <textarea 
                  value={comment} 
                  onChange={(e) => setComment(e.target.value)} 
                  placeholder="Add a comment..." 
                  rows="2"
                  disabled={sendingComment}
                />
                <button onClick={handleAddComment} disabled={sendingComment || !comment.trim()}>
                  {sendingComment ? <Loader size={16} className="spin" /> : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }
          .modal-container.large {
            background: white;
            border-radius: 20px;
            width: 90%;
            max-width: 900px;
            max-height: 90vh;
            overflow-y: auto;
          }
          .modal-container.loading {
            text-align: center;
            padding: 60px;
          }
          .loading-spinner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            color: #64748b;
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 20px 24px;
            border-bottom: 1px solid #e2e8f0;
            position: sticky;
            top: 0;
            background: white;
            z-index: 10;
          }
          .modal-header h2 { margin: 0 0 8px; font-size: 20px; }
          .sheet-meta { display: flex; gap: 16px; font-size: 12px; color: #64748b; flex-wrap: wrap; }
          .status.approved { color: #22c55e; }
          .status.draft { color: #d97706; }
          .header-actions { display: flex; gap: 8px; }
          .icon-btn {
            width: 36px;
            height: 36px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #475569;
            transition: all 0.2s;
          }
          .icon-btn.download:hover { background: #eff6ff; color: #3b82f6; }
          .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .close-btn { background: none; border: none; cursor: pointer; padding: 4px; color: #666; }
          .tabs { display: flex; gap: 8px; padding: 0 24px; border-bottom: 1px solid #e2e8f0; }
          .tab {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 12px 16px;
            background: none;
            border: none;
            cursor: pointer;
            color: #64748b;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
          }
          .tab.active { color: #1a1a1a; border-bottom-color: #1a1a1a; }
          .modal-body { padding: 24px; max-height: 60vh; overflow-y: auto; }
          .info-card { background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 20px; }
          .info-card h4 { margin: 0 0 12px; font-size: 14px; color: #64748b; }
          .info-card h5 { margin: 12px 0 8px; font-size: 13px; font-weight: 600; }
          .members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
          .member-item { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 13px; }
          .role-badge { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
          .excuse-item { display: flex; gap: 8px; padding: 4px 0; }
          .excuse-reason { color: #22c55e; font-size: 13px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
          .signature-line { display: flex; gap: 16px; align-items: center; font-size: 13px; }
          .signature-placeholder { border-bottom: 1px solid #000; min-width: 150px; }
          .stats-summary { display: flex; gap: 24px; padding: 16px; background: #f8fafc; border-radius: 12px; margin-bottom: 20px; }
          .absent-item { display: flex; align-items: center; gap: 12px; padding: 8px; border-bottom: 1px solid #f0f0f0; }
          .excused-badge { background: #dcfce7; color: #22c55e; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
          .comments-list { max-height: 300px; overflow-y: auto; }
          .comment-item { display: flex; gap: 12px; padding: 12px; border-bottom: 1px solid #f1f5f9; }
          .comment-avatar { width: 32px; height: 32px; background: #1a1a1a; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
          .comment-header { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; color: #64748b; }
          .comment-input { display: flex; gap: 12px; padding-top: 16px; margin-top: 16px; border-top: 1px solid #e2e8f0; }
          .comment-input textarea { flex: 1; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; resize: none; }
          .comment-input textarea:disabled { background: #f8fafc; }
          .comment-input button { padding: 10px 20px; background: #1a1a1a; color: white; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
          .comment-input button:disabled { opacity: 0.5; cursor: not-allowed; }
          details { margin-bottom: 16px; }
          details summary { cursor: pointer; font-weight: 500; padding: 8px; background: #f8fafc; border-radius: 8px; }
          .empty-state { text-align: center; padding: 40px; color: #64748b; }
          @media (max-width: 768px) { .members-grid { grid-template-columns: 1fr; } .signatures { flex-direction: column; gap: 16px; } }
        `}</style>
      </div>
    </div>
  );
}