// frontend/src/components/minutes/ActionItemsWidget.jsx
import React, { useState, useEffect } from 'react';
import { CheckSquare, ChevronRight, Clock, Calendar } from 'lucide-react';
import { api } from '../../api';

export default function ActionItemsWidget({ onViewAll }) {
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActionItems();
  }, []);

  const fetchActionItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/api/minutes/my/action-items', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActionItems(response.data.actionItems);
    } catch (error) {
      console.error('Error fetching action items:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (itemId, status) => {
    try {
      const token = localStorage.getItem('token');
      await api.put(`/api/minutes/action-items/${itemId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchActionItems();
    } catch (error) {
      console.error('Error updating action item:', error);
    }
  };

  if (loading) {
    return <div className="widget-loading">Loading tasks...</div>;
  }

  const pendingItems = actionItems.filter(i => i.status !== 'COMPLETED');
  const dueSoon = pendingItems.filter(i => i.dueDate && new Date(i.dueDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));

  return (
    <div className="action-items-widget">
      <div className="widget-header">
        <div className="title">
          <CheckSquare size={18} />
          <h3>My Action Items</h3>
          {pendingItems.length > 0 && <span className="badge">{pendingItems.length}</span>}
        </div>
        {pendingItems.length > 0 && (
          <button className="view-all" onClick={onViewAll}>
            View All <ChevronRight size={14} />
          </button>
        )}
      </div>

      {pendingItems.length === 0 ? (
        <div className="empty-state">
          <CheckSquare size={32} />
          <p>No pending tasks</p>
          <small>You're all caught up!</small>
        </div>
      ) : (
        <div className="items-list">
          {pendingItems.slice(0, 5).map(item => (
            <div key={item.id} className="action-item">
              <input
                type="checkbox"
                checked={false}
                onChange={() => updateStatus(item.id, 'COMPLETED')}
              />
              <div className="item-content">
                <div className="item-task">{item.task}</div>
                <div className="item-meta">
                  <span className="meeting">{item.minutes?.title}</span>
                  {item.dueDate && (
                    <span className={`due-date ${new Date(item.dueDate) < new Date() ? 'overdue' : ''}`}>
                      <Calendar size={10} /> Due: {new Date(item.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {dueSoon.length > 0 && (
        <div className="urgent-notice">
          <Clock size={12} />
          <span>{dueSoon.length} task(s) due soon</span>
        </div>
      )}

      <style>{`
        .action-items-widget { background: white; border-radius: 16px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .widget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .title { display: flex; align-items: center; gap: 8px; }
        .title h3 { margin: 0; font-size: 16px; }
        .badge { background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .view-all { background: none; border: none; color: #666; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; }
        .items-list { display: flex; flex-direction: column; gap: 12px; }
        .action-item { display: flex; gap: 12px; align-items: flex-start; }
        .action-item input { margin-top: 2px; }
        .item-content { flex: 1; }
        .item-task { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
        .item-meta { display: flex; gap: 12px; font-size: 11px; color: #666; }
        .meeting { color: #3b82f6; }
        .due-date.overdue { color: #ef4444; }
        .empty-state { text-align: center; padding: 24px; color: #666; }
        .urgent-notice { margin-top: 12px; padding: 8px; background: #fef3c7; border-radius: 8px; font-size: 12px; display: flex; align-items: center; gap: 8px; color: #d97706; }
        .widget-loading { padding: 24px; text-align: center; color: #666; }
      `}</style>
    </div>
  );
}