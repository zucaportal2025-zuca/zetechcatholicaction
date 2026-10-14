import React from 'react';
import { Calendar, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';

export default function MinutesCard({ minutes, onClick, isMobile }) {
  const getStatusBadge = (status) => {
    switch(status) {
      case 'APPROVED':
        return <span className="status-badge approved">✅ APPROVED</span>;
      case 'DRAFT':
        return <span className="status-badge draft">📝 DRAFT</span>;
      default:
        return <span className="status-badge draft">📝 {status}</span>;
    }
  };

  const getTypeIcon = (type) => {
    return type === 'EXECUTIVE' ? '👑' : '🏠';
  };

  const presentCount = minutes.presentMembers?.length || 0;
  const absentCount = minutes.absentMembers?.length || 0;
  const decisionsCount = minutes.sections?.filter(s => s.decisions?.length > 0).reduce((sum, s) => sum + s.decisions.length, 0) || 0;
  const actionItemsCount = minutes.assignedActions?.length || minutes.actionItems?.length || 0;

  return (
    <div className="minutes-card" onClick={() => onClick(minutes)}>
      <div className="card-header">
        <div className="title-section">
          <span className="type-icon">{getTypeIcon(minutes.type)}</span>
          <h3>{minutes.title}</h3>
        </div>
        {getStatusBadge(minutes.status)}
      </div>
      
      <div className="card-details">
        <div className="detail-row">
          <Calendar size={14} />
          <span>{new Date(minutes.meetingDate).toLocaleDateString()}</span>
          <Clock size={14} />
          <span>{minutes.meetingTime || '4:30 PM'}</span>
          <MapPin size={14} />
          <span>{minutes.venue || 'ZUCA'}</span>
        </div>
      </div>
      
      <div className="stats-row">
        <div className="stat">
          <CheckCircle size={14} className="success" />
          <span>{presentCount} Present</span>
        </div>
        <div className="stat">
          <XCircle size={14} className="danger" />
          <span>{absentCount} Absent</span>
        </div>
        <div className="stat">
          <span>📋 {decisionsCount} Decisions</span>
        </div>
        <div className="stat">
          <span>✅ {actionItemsCount} Actions</span>
        </div>
      </div>
      
      <div className="view-btn-wrapper">
        <button className="view-btn">View →</button>
      </div>

      <style>{`
        .minutes-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }
        .minutes-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          border-color: #cbd5e1;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .title-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .type-icon {
          font-size: 20px;
        }
        .card-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
        }
        .status-badge {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 500;
        }
        .status-badge.approved {
          background: #dcfce7;
          color: #22c55e;
        }
        .status-badge.draft {
          background: #fef3c7;
          color: #d97706;
        }
        .card-details {
          margin: 12px 0;
        }
        .detail-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: #64748b;
          flex-wrap: wrap;
        }
        .detail-row span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .stats-row {
          display: flex;
          gap: 16px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
          flex-wrap: wrap;
        }
        .stat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }
        .stat .success {
          color: #22c55e;
        }
        .stat .danger {
          color: #ef4444;
        }
        .view-btn-wrapper {
          margin-top: 12px;
          text-align: right;
        }
        .view-btn {
          background: none;
          border: none;
          color: #3b82f6;
          font-size: 13px;
          cursor: pointer;
          padding: 4px 8px;
        }
        .view-btn:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}