import React, { useState, useEffect, useRef } from 'react';
import { Activity, Wifi, UserPlus, UserCheck, Clock, Bell, XCircle } from 'lucide-react';
import io from 'socket.io-client';
import BASE_URL from '../../../api';

export default function LiveActivityFeed({ sheetId, onNewCheckin }) {
  // ============ STATE ============
  const [activities, setActivities] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const socketRef = useRef(null);
  
  // ============ ADD ACTIVITY ============
  const addActivity = (activity) => {
    const newActivity = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      ...activity
    };
    
    setActivities(prev => [newActivity, ...prev].slice(0, 50)); // Keep last 50
  };
  
  // ============ FORMAT RELATIVE TIME ============
  const formatRelativeTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    return date.toLocaleTimeString();
  };
  
  // ============ GET ACTIVITY ICON ============
  const getActivityIcon = (type) => {
    switch(type) {
      case 'self_checkin': return <UserCheck size={14} className="icon-self" />;
           case 'qr_checkin': return <QrCode size={14} className="icon-qr" />;
      case 'admin_add': return <UserPlus size={14} className="icon-admin" />;
      case 'admin_edit': return <UserCheck size={14} className="icon-edit" />;
      case 'admin_delete': return <XCircle size={14} className="icon-delete" />;
      case 'reminder_sent': return <Bell size={14} className="icon-reminder" />;
      default: return <Activity size={14} className="icon-default" />;
    }
  };
  
  // ============ GET ACTIVITY MESSAGE ============
  const getActivityMessage = (activity) => {
    switch(activity.type) {
      case 'self_checkin':
        return `${activity.userName} checked in via Self`;
           case 'qr_checkin':
        return `${activity.userName} checked in via QR Code`;
      case 'admin_add':
        return `Admin added ${activity.userName}`;
      case 'admin_edit':
        return `Admin updated ${activity.userName}'s details`;
      case 'admin_delete':
        return `Admin removed ${activity.userName}`;
      case 'reminder_sent':
        return `Reminders sent to ${activity.count} absent members`;
      default:
        return activity.message;
    }
  };
  
  // ============ WEB SOCKET CONNECTION ============
  useEffect(() => {
    // Connect to socket
    const socket = io(BASE_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('🔌 Live activity feed connected');
      setIsConnected(true);
      
      // Join sheet room
      socket.emit('join_attendance_sheet', sheetId);
      
      addActivity({
        type: 'system',
        message: 'Connected to live feed',
        userName: 'System'
      });
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Live activity feed disconnected');
      setIsConnected(false);
    });
    
    // Listen for check-in events
    socket.on('attendance_checkin', (data) => {
      if (data.sheetId === sheetId) {
        addActivity({
                   type: data.method === 'SELF' ? 'self_checkin' : 'qr_checkin',
          userName: data.userName,
          method: data.method,
          time: data.time
        });
        
        // Refresh parent component data
        if (onNewCheckin) onNewCheckin();
      }
    });
    
    // Listen for admin actions
    socket.on('attendance_admin_action', (data) => {
      if (data.sheetId === sheetId) {
        addActivity({
          type: data.action,
          userName: data.userName,
          count: data.count
        });
        
        if (onNewCheckin && (data.action === 'admin_add' || data.action === 'admin_delete')) {
          onNewCheckin();
        }
      }
    });
    
    // Listen for sheet events
    socket.on('attendance_sheet_closed', (data) => {
      if (data.sheetId === sheetId) {
        addActivity({
          type: 'system',
          message: 'Sheet has been closed. No more check-ins accepted.',
          userName: 'System'
        });
      }
    });
    
    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_attendance_sheet', sheetId);
        socketRef.current.disconnect();
      }
    };
  }, [sheetId]);
  
  // ============ AUTO-SCROLL TO BOTTOM ============
  const feedEndRef = useRef(null);
  
  useEffect(() => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activities]);
  
  // ============ CLEAR ACTIVITIES ============
  const clearActivities = () => {
    setActivities([]);
  };
  
  return (
    <div className="live-feed-container">
      {/* Header */}
      <div className="feed-header">
        <div className="feed-title">
          <Activity size={16} />
          <span>Live Activity Feed</span>
          {isConnected ? (
            <span className="status-badge connected">● Connected</span>
          ) : (
            <span className="status-badge disconnected">○ Reconnecting...</span>
          )}
        </div>
        {activities.length > 0 && (
          <button className="clear-btn" onClick={clearActivities}>
            Clear
          </button>
        )}
      </div>
      
      {/* Activities List */}
      <div className="feed-list">
        {activities.length === 0 ? (
          <div className="empty-feed">
            <Activity size={24} />
            <p>Waiting for activity...</p>
            <span>New check-ins will appear here</span>
          </div>
        ) : (
          activities.map(activity => (
            <div key={activity.id} className={`feed-item ${activity.type}`}>
              <div className="feed-icon">
                {getActivityIcon(activity.type)}
              </div>
              <div className="feed-content">
                <div className="feed-message">
                  {getActivityMessage(activity)}
                </div>
                <div className="feed-time">
                  <Clock size={10} />
                  {formatRelativeTime(activity.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={feedEndRef} />
      </div>
      
      <style>{`
        .live-feed-container {
          background: #f8f8f8;
          border-radius: 12px;
          margin: 0 24px 20px;
          border: 1px solid #e0e0e0;
          overflow: hidden;
        }
        
        .feed-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: white;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .feed-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
        }
        
        .status-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 20px;
        }
        
        .status-badge.connected {
          background: #dcfce7;
          color: #22c55e;
        }
        
        .status-badge.disconnected {
          background: #fee2e2;
          color: #ef4444;
        }
        
        .clear-btn {
          background: none;
          border: none;
          font-size: 11px;
          color: #666;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
        }
        
        .clear-btn:hover {
          background: #f0f0f0;
        }
        
        .feed-list {
          max-height: 250px;
          overflow-y: auto;
          padding: 8px;
        }
        
        .empty-feed {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }
        
        .empty-feed p {
          margin: 8px 0 4px;
          font-size: 13px;
        }
        
        .empty-feed span {
          font-size: 11px;
        }
        
        .feed-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: white;
          border-radius: 10px;
          margin-bottom: 6px;
          animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .feed-item.self_checkin {
          border-left: 3px solid #3b82f6;
        }
        
                        .icon-qr { color: #22c55e; }
          border-left: 3px solid #22c55e;
        }
        
        .feed-item.qr_checkin {
          border-left: 3px solid #059669;
        }
        
        .feed-item.admin_add {
          border-left: 3px solid #f59e0b;
        }
        
        .feed-item.admin_edit {
          border-left: 3px solid #8b5cf6;
        }
        
        .feed-item.admin_delete {
          border-left: 3px solid #ef4444;
        }
        
        .feed-item.reminder_sent {
          border-left: 3px solid #ec4899;
        }
        
        .feed-item.system {
          border-left: 3px solid #666;
        }
        
        .feed-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
        }
        
        .icon-self { color: #3b82f6; }
        .icon-wifi { color: #22c55e; }
        .icon-admin { color: #f59e0b; }
        .icon-edit { color: #8b5cf6; }
        .icon-delete { color: #ef4444; }
        .icon-reminder { color: #ec4899; }
        .icon-default { color: #666; }
        
        .feed-content {
          flex: 1;
        }
        
        .feed-message {
          font-size: 13px;
          font-weight: 500;
          color: #1a1a1a;
        }
        
        .feed-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: #999;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}