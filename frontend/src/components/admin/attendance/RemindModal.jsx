import React, { useState } from 'react';
import { X, Bell, Send, Users, User, Mail, Phone, AlertCircle } from 'lucide-react';

export default function RemindModal({ sheet, remindType = 'all', onClose, onSend }) {
  // ============ STATE ============
  const [message, setMessage] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [customList, setCustomList] = useState('');
  const [loading, setLoading] = useState(false);
  const [reminderOption, setReminderOption] = useState(remindType); // all, selected, custom
  
  // ============ MESSAGE TEMPLATES ============
  const messageTemplates = {
    urgent: `URGENT: You missed today's meeting "${sheet.title}". Important decisions were made. Please contact the organizer immediately for updates.`,
    gentle: `Dear member, we missed you at "${sheet.title}" today. Please catch up on what you missed. Hope to see you next time!`,
    reminder: `REMINDER: "${sheet.title}" is happening now at ${sheet.location || 'ZUCA'}. Please join us!`,
    finance: `IMPORTANT: You missed today's finance review for "${sheet.title}". Please check with the treasurer for important updates on contributions.`
  };
  
  // ============ HANDLE TEMPLATE SELECT ============
  const applyTemplate = (templateKey) => {
    setMessage(messageTemplates[templateKey]);
  };
  
  // ============ HANDLE CUSTOM LIST ============
  const handleCustomListChange = (e) => {
    setCustomList(e.target.value);
    const phones = e.target.value.split(',').map(p => p.trim());
    setSelectedMembers(phones);
  };
  
  // ============ HANDLE SUBMIT ============
  const handleSubmit = async () => {
    if (reminderOption === 'custom' && !customList) {
      alert('Please enter phone numbers or emails');
      return;
    }
    
    if (!message) {
      alert('Please enter a message');
      return;
    }
    
    setLoading(true);
    try {
      await onSend(message);
      onClose();
    } catch (error) {
      console.error('Error sending reminders:', error);
      alert(error.response?.data?.error || 'Failed to send reminders');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <div className="header-icon">
            <Bell size={24} />
          </div>
          <h2>Send Reminders</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        {/* Meeting Info */}
        <div className="meeting-info">
          <div className="meeting-title">{sheet.title}</div>
          <div className="meeting-details">
            {new Date(sheet.eventDate).toLocaleDateString()} at {sheet.eventTime || '4:30 PM'} • {sheet.location || 'ZUCA'}
          </div>
        </div>
        
        {/* Recipient Selection */}
        <div className="section">
          <div className="section-title">Recipients</div>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="recipientType"
                checked={reminderOption === 'all'}
                onChange={() => setReminderOption('all')}
              />
              <div className="radio-content">
                <Users size={16} />
                <div>
                  <div className="option-title">All Absent Members</div>
                  <div className="option-desc">Send reminder to everyone who missed the meeting</div>
                </div>
              </div>
            </label>
            
            <label className="radio-option">
              <input
                type="radio"
                name="recipientType"
                checked={reminderOption === 'selected'}
                onChange={() => setReminderOption('selected')}
              />
              <div className="radio-content">
                <User size={16} />
                <div>
                  <div className="option-title">Selected Members Only</div>
                  <div className="option-desc">Choose specific members from the list</div>
                </div>
              </div>
            </label>
            
            <label className="radio-option">
              <input
                type="radio"
                name="recipientType"
                checked={reminderOption === 'custom'}
                onChange={() => setReminderOption('custom')}
              />
              <div className="radio-content">
                <Mail size={16} />
                <div>
                  <div className="option-title">Custom List</div>
                  <div className="option-desc">Enter phone numbers or emails manually</div>
                </div>
              </div>
            </label>
          </div>
        </div>
        
        {/* Custom List Input */}
        {reminderOption === 'custom' && (
          <div className="section">
            <div className="section-title">Phone Numbers or Emails</div>
            <textarea
              className="custom-list-input"
              placeholder="Enter phone numbers or emails separated by commas&#10;e.g., 0712345678, 0723456789, john@example.com"
              value={customList}
              onChange={handleCustomListChange}
              rows="3"
            />
            <div className="helper-text">
              <AlertCircle size={12} />
              Separate multiple entries with commas
            </div>
          </div>
        )}
        
        {/* Message Templates */}
        <div className="section">
          <div className="section-title">Quick Templates</div>
          <div className="template-buttons">
            <button className="template-btn" onClick={() => applyTemplate('urgent')}>
              ⚠️ Urgent
            </button>
            <button className="template-btn" onClick={() => applyTemplate('gentle')}>
              💚 Gentle
            </button>
            <button className="template-btn" onClick={() => applyTemplate('reminder')}>
              🔔 Reminder
            </button>
            <button className="template-btn" onClick={() => applyTemplate('finance')}>
              💰 Finance
            </button>
          </div>
        </div>
        
        {/* Message Input */}
        <div className="section">
          <div className="section-title">Message</div>
          <textarea
            className="message-input"
            placeholder="Type your reminder message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows="5"
          />
          <div className="char-count">{message.length} characters</div>
        </div>
        
        {/* Preview */}
        {message && (
          <div className="preview-section">
            <div className="section-title">Preview</div>
            <div className="preview-box">
              <div className="preview-header">
                <strong>ZUCA Attendance Reminder</strong>
              </div>
              <div className="preview-message">{message}</div>
              <div className="preview-footer">
                Tumsifu Yesu Kristu! 🙏
              </div>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSubmit} 
            disabled={loading || !message}
          >
            <Send size={16} />
            {loading ? 'Sending...' : 'Send Reminders'}
          </button>
        </div>
        
      </div>
      
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-container {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 550px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }
        
        .header-icon {
          width: 40px;
          height: 40px;
          background: #fef3c7;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d97706;
        }
        
        .modal-header h2 {
          margin: 0;
          flex: 1;
          font-size: 18px;
          font-weight: 600;
        }
        
        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }
        
        .meeting-info {
          margin: 20px 24px;
          padding: 12px 16px;
          background: #f8f8f8;
          border-radius: 12px;
          text-align: center;
        }
        
        .meeting-title {
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .meeting-details {
          font-size: 12px;
          color: #666;
        }
        
        .section {
          margin: 0 24px 20px;
        }
        
        .section-title {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #1a1a1a;
        }
        
        .radio-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .radio-option {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          transition: all 0.2s;
        }
        
        .radio-option:hover {
          background: #f8f8f8;
        }
        
        .radio-option input {
          margin-top: 2px;
        }
        
        .radio-content {
          display: flex;
          gap: 10px;
          flex: 1;
        }
        
        .option-title {
          font-weight: 500;
          font-size: 13px;
        }
        
        .option-desc {
          font-size: 11px;
          color: #666;
        }
        
        .custom-list-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 13px;
          font-family: monospace;
          resize: vertical;
        }
        
        .template-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .template-btn {
          padding: 6px 14px;
          background: #f0f0f0;
          border: none;
          border-radius: 20px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .template-btn:hover {
          background: #e0e0e0;
        }
        
        .message-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
        }
        
        .char-count {
          font-size: 11px;
          color: #666;
          text-align: right;
          margin-top: 4px;
        }
        
        .preview-section {
          margin: 0 24px 20px;
        }
        
        .preview-box {
          background: #f8f8f8;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #e0e0e0;
        }
        
        .preview-header {
          font-size: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e0e0e0;
          margin-bottom: 12px;
        }
        
        .preview-message {
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
          margin-bottom: 12px;
        }
        
        .preview-footer {
          font-size: 11px;
          color: #666;
          text-align: center;
          padding-top: 8px;
          border-top: 1px solid #e0e0e0;
        }
        
        .helper-text {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #666;
          margin-top: 6px;
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e0e0e0;
        }
        
        .btn-secondary {
          padding: 10px 20px;
          background: #f0f0f0;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}