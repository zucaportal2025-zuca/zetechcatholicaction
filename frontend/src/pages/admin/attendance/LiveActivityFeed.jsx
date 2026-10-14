import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import BASE_URL from '../../../api';
import { Users, CheckCircle, Clock } from 'lucide-react';

export default function LiveActivityFeed({ sheetId, onNewCheckin }) {
  const [activities, setActivities] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(BASE_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    newSocket.on('connect', () => {
      console.log('LiveActivityFeed connected');
      newSocket.emit('join_attendance_sheet', sheetId);
    });

    newSocket.on('attendance_checkin', (data) => {
      if (data.sheetId === sheetId) {
        const newActivity = {
          id: Date.now(),
          userName: data.userName,
          time: new Date(data.timestamp || Date.now()),
          type: 'checkin'
        };
        setActivities(prev => [newActivity, ...prev].slice(0, 20));
        if (onNewCheckin) onNewCheckin();
      }
    });

    newSocket.on('attendance_entry_added', (data) => {
      if (data.sheetId === sheetId) {
        const newActivity = {
          id: Date.now(),
          userName: data.entry?.fullName || 'Someone',
          time: new Date(),
          type: 'manual'
        };
        setActivities(prev => [newActivity, ...prev].slice(0, 20));
      }
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit('leave_attendance_sheet', sheetId);
        newSocket.disconnect();
      }
    };
  }, [sheetId, onNewCheckin]);

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    return `${Math.floor(seconds / 3600)} hour ago`;
  };

  if (activities.length === 0) return null;

  return (
    <div className="live-activity-feed">
      <div className="feed-header">
        <div className="feed-title">
          <span className="live-dot"></span>
          LIVE ACTIVITY
        </div>
        <span className="feed-count">{activities.length} recent</span>
      </div>
      <div className="feed-list">
        {activities.map(activity => (
          <div key={activity.id} className="feed-item">
            <div className="feed-icon">
              {activity.type === 'checkin' ? <CheckCircle size={14} /> : <Users size={14} />}
            </div>
            <div className="feed-content">
              <span className="feed-user">{activity.userName}</span>
              <span className="feed-action">
                {activity.type === 'checkin' ? 'checked in' : 'was added'}
              </span>
              <span className="feed-time">{getTimeAgo(activity.time)}</span>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .live-activity-feed {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          margin-bottom: 20px;
          overflow: hidden;
        }
        .feed-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          font-size: 12px;
          font-weight: 600;
          color: #1e293b;
        }
        .live-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          margin-right: 8px;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        .feed-count {
          font-size: 11px;
          color: #64748b;
          font-weight: normal;
        }
        .feed-list {
          max-height: 200px;
          overflow-y: auto;
        }
        .feed-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
        }
        .feed-icon {
          width: 24px;
          height: 24px;
          background: #eff6ff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
        }
        .feed-content {
          flex: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .feed-user {
          font-weight: 600;
          color: #0f172a;
        }
        .feed-action {
          color: #64748b;
        }
        .feed-time {
          font-size: 11px;
          color: #94a3b8;
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}