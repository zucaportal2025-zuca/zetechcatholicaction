import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, CheckCircle, XCircle, Edit2, Send, Trash2, MessageCircle, CheckSquare, FileText, Users } from 'lucide-react';
import { api } from '../../api';

export default function MinutesDetailsModal({ minutesId, onClose, onRefresh }) {
  const [minutes, setMinutes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('minutes');
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => { fetchMinutes(); }, [minutesId]);

  const fetchMinutes = async () => {
    try {
      const response = await api.get(`/api/minutes/${minutesId}`, { headers: { Authorization: `Bearer ${token}` } });
      setMinutes(response.data.minutes);
    } catch (error) { console.error('Error fetching minutes:', error); } finally { setLoading(false); }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setSendingComment(true);
    try {
      await api.post(`/api/minutes/${minutesId}/comment`, { comment }, { headers: { Authorization: `Bearer ${token}` } });
      setComment('');
      fetchMinutes();
    } catch (error) { console.error('Error adding comment:', error); } finally { setSendingComment(false); }
  };

  if (loading) return <div className="modal-overlay" onClick={onClose}><div className="modal-container"><div className="loader"></div></div></div>;
  if (!minutes) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div><h2>{minutes.title}</h2><div className="sheet-meta"><span><Calendar size={14} /> {new Date(minutes.meetingDate).toLocaleDateString()}</span><span><Clock size={14} /> {minutes.meetingTime || '4:30 PM'}</span><span><MapPin size={14} /> {minutes.venue || 'ZUCA'}</span><span className={`status ${minutes.status === 'APPROVED' ? 'approved' : 'draft'}`}>{minutes.status === 'APPROVED' ? '● APPROVED' : '● DRAFT'}</span></div></div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="tabs"><button className={`tab ${activeTab === 'minutes' ? 'active' : ''}`} onClick={() => setActiveTab('minutes')}><FileText size={14} /> Minutes</button><button className={`tab ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}><Users size={14} /> Attendance</button><button className={`tab ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}><MessageCircle size={14} /> Comments</button></div>

        <div className="modal-body">
          {activeTab === 'minutes' && (
            <div>
              <div className="info-card"><h4>MEMBERS PRESENT ({minutes.presentMembers?.length || 0})</h4><div className="members-grid">{minutes.presentMembers?.map((m, idx) => (<div key={idx} className="member-item"><span>{idx + 1}. {m.fullName}</span>{m.role && <span className="role-badge">{m.role}</span>}</div>))}</div></div>
              {minutes.absentMembers?.filter(m => m.excused).length > 0 && (<div className="info-card"><h4>ABSENT WITH APOLOGY</h4>{minutes.absentMembers.filter(m => m.excused).map((m, idx) => (<div key={idx} className="excuse-item"><span>{m.fullName}</span><span className="excuse-reason">— {m.excuse || 'Excused'}</span></div>))}</div>)}
              {minutes.agenda?.length > 0 && (<div className="info-card"><h4>AGENDA</h4><ol>{minutes.agenda.map((item, idx) => <li key={idx}>{item}</li>)}</ol></div>)}
              {minutes.preliminaries && (<div className="info-card"><h4>PRELIMINARIES</h4><p>{minutes.preliminaries}</p></div>)}
              {minutes.sections?.map((section, idx) => (<div key={idx} className="info-card"><h4>{section.number}: {section.title}</h4><p>{section.content}</p>{section.decisions?.length > 0 && (<><h5>DECISIONS:</h5><ul>{section.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul></>)}</div>))}
              {minutes.adjournment && (<div className="info-card"><h4>ADJOURNMENT</h4><p>{minutes.adjournment}</p></div>)}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div><div className="stats-summary"><div className="stat">✅ Present: {minutes.presentMembers?.length || 0}</div><div className="stat">❌ Absent: {minutes.absentMembers?.length || 0}</div><div className="stat">👥 Guests: {minutes.presentGuests?.length || 0}</div></div>
            <details><summary>Present Members ({minutes.presentMembers?.length || 0})</summary><div className="members-grid">{minutes.presentMembers?.map((m, idx) => (<div key={idx} className="member-item">{m.fullName} {m.role && <span className="role-badge">{m.role}</span>}</div>))}</div></details>
            <details><summary>Absent Members ({minutes.absentMembers?.length || 0})</summary>{minutes.absentMembers?.map((m, idx) => (<div key={idx} className="absent-item"><span>{m.fullName}</span>{m.excuse && <span className="excuse">— {m.excuse}</span>}{m.excused && <span className="excused-badge">Excused</span>}</div>))}</details></div>
          )}

          {activeTab === 'comments' && (
            <div><div className="comments-list">{minutes.comments?.length === 0 ? <div className="empty-state">No comments yet</div> : minutes.comments.map(comment => (<div key={comment.id} className="comment-item"><div className="comment-avatar">{comment.user?.fullName?.[0] || 'U'}</div><div className="comment-content"><div className="comment-header"><strong>{comment.user?.fullName || 'Unknown'}</strong><span>{new Date(comment.createdAt).toLocaleString()}</span></div><p>{comment.comment}</p></div></div>))}</div>
            <div className="comment-input"><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment..." rows="2" /><button onClick={handleAddComment} disabled={sendingComment || !comment.trim()}>{sendingComment ? 'Sending...' : 'Send'}</button></div></div>
          )}
        </div>

        <style>{`
          .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
          .modal-container.large { background: white; border-radius: 20px; width: 90%; max-width: 900px; max-height: 90vh; overflow-y: auto; }
          .modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; background: white; }
          .modal-header h2 { margin: 0 0 8px; font-size: 20px; }
          .sheet-meta { display: flex; gap: 16px; font-size: 12px; color: #64748b; flex-wrap: wrap; }
          .status.approved { color: #22c55e; }
          .status.draft { color: #d97706; }
          .close-btn { background: none; border: none; cursor: pointer; padding: 4px; color: #666; }
          .tabs { display: flex; gap: 8px; padding: 0 24px; border-bottom: 1px solid #e2e8f0; }
          .tab { display: flex; align-items: center; gap: 6px; padding: 12px 16px; background: none; border: none; cursor: pointer; color: #64748b; border-bottom: 2px solid transparent; }
          .tab.active { color: #1a1a1a; border-bottom-color: #1a1a1a; }
          .modal-body { padding: 24px; }
          .info-card { background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 20px; }
          .info-card h4 { margin: 0 0 12px; font-size: 14px; color: #64748b; }
          .members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
          .member-item { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 13px; }
          .role-badge { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
          .stats-summary { display: flex; gap: 24px; padding: 16px; background: #f8fafc; border-radius: 12px; margin-bottom: 20px; }
          .comment-item { display: flex; gap: 12px; padding: 12px; border-bottom: 1px solid #f1f5f9; }
          .comment-avatar { width: 32px; height: 32px; background: #1a1a1a; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
          .comment-header { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; color: #64748b; }
          .comment-input { display: flex; gap: 12px; padding-top: 16px; margin-top: 16px; border-top: 1px solid #e2e8f0; }
          .comment-input textarea { flex: 1; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; resize: none; }
          .comment-input button { padding: 10px 20px; background: #1a1a1a; color: white; border: none; border-radius: 8px; cursor: pointer; }
          details { margin-bottom: 16px; }
          details summary { cursor: pointer; font-weight: 500; padding: 8px; background: #f8fafc; border-radius: 8px; }
          .empty-state { text-align: center; padding: 40px; color: #64748b; }
          @media (max-width: 768px) { .members-grid { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    </div>
  );
}