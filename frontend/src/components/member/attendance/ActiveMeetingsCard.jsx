import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, QrCode } from 'lucide-react';
export default function ActiveMeetingsCard({ meetings, onCheckin, checkingIn }) {
  const navigate = useNavigate();
  
  if (!meetings || meetings.length === 0) return null;
  
  return (
    <div className="active-meetings-card">
      <div className="card-header">
        <div className="header-title">
          <span className="live-dot"></span>
          <h3>Active Meetings</h3>
        </div>
        <button className="view-all" onClick={() => navigate('/member/attendance')}>
          View All →
        </button>
      </div>
      
      <div className="meetings-list">
        {meetings.slice(0, 2).map(meeting => (
          <div key={meeting.id} className="meeting-item">
            <div className="meeting-info">
              <h4>{meeting.title}</h4>
              <div className="meeting-meta">
                <span><Calendar size={12} /> {new Date(meeting.eventDate).toLocaleDateString()}</span>
                <span><Clock size={12} /> {meeting.eventTime || '4:30 PM'}</span>
                <span><MapPin size={12} /> {meeting.location || 'ZUCA'}</span>
              </div>
                            <div className="meeting-stats">
                <Users size={12} /> {meeting._count?.entries || 0} checked in
                {meeting.enableQRCheckin && <QrCode size={12} className="qr-icon" />}
              </div>
            </div>
            <button 
              className="checkin-btn-small"
              onClick={() => onCheckin(meeting.id)}
              disabled={checkingIn === meeting.id}
            >
              {checkingIn === meeting.id ? '...' : 'Check In'}
            </button>
          </div>
        ))}
      </div>
      
      <style>{`
        .active-meetings-card {
          background: white;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .header-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .live-dot {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .header-title h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
        }
        .view-all {
          background: none;
          border: none;
          color: #3b82f6;
          font-size: 12px;
          cursor: pointer;
        }
        .meetings-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .meeting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: #f8fafc;
          border-radius: 12px;
        }
        .meeting-info h4 {
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 6px 0;
        }
        .meeting-meta {
          display: flex;
          gap: 12px;
          font-size: 10px;
          color: #64748b;
          margin-bottom: 4px;
        }
        .meeting-stats {
          font-size: 10px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 6px;
        }
                .qr-icon { color: #3b82f6; }
        .checkin-btn-small {
          background: #ef4444;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
        }
        .checkin-btn-small:disabled { opacity: 0.5; }
      `}</style>
    </div>
  );
}