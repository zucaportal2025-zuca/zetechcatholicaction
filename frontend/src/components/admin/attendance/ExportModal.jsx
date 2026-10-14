import React, { useState } from 'react';
import { X, Download, FileText, FileSpreadsheet, File, CheckCircle, Users, UserCheck, UserX, Calendar } from 'lucide-react';

export default function ExportModal({ sheet, onClose, onExport }) {
  // ============ STATE ============
  const [exportType, setExportType] = useState('full'); // full, present, absent, signin
  const [format, setFormat] = useState('word'); // word, pdf, excel
  const [loading, setLoading] = useState(false);
  const [includeFields, setIncludeFields] = useState({
    name: true,
    phone: true,
    role: true,
    time: true,
    method: true,
    membership: false,
    jumuia: false,
    notes: false
  });
  
  // ============ TOGGLE FIELD ============
  const toggleField = (field) => {
    setIncludeFields(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  // ============ HANDLE EXPORT ============
  const handleExport = async () => {
    setLoading(true);
    try {
      await onExport({
        type: exportType,
        format: format,
        includeFields: includeFields
      });
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert(error.response?.data?.error || 'Failed to export report');
    } finally {
      setLoading(false);
    }
  };
  
  // ============ EXPORT TYPE OPTIONS ============
  const exportOptions = [
    {
      id: 'full',
      title: 'Full Attendance Report',
      description: 'Complete report with all members, statistics, and method breakdown',
      icon: <FileText size={20} />,
      color: '#1a1a1a'
    },
    {
      id: 'present',
      title: 'Present Members Only',
      description: 'Clean list of who attended - Name, Phone, Time',
      icon: <UserCheck size={20} />,
      color: '#22c55e'
    },
    {
      id: 'absent',
      title: 'Absent Members Only',
      description: 'List of members who missed the meeting',
      icon: <UserX size={20} />,
      color: '#ef4444'
    },
    {
      id: 'signin',
      title: 'Sign-in Sheet (Blank)',
      description: 'Blank sheet with member names for manual sign-in',
      icon: <File size={20} />,
      color: '#f59e0b'
    }
  ];
  
  // ============ FORMAT OPTIONS ============
  const formatOptions = [
    { id: 'word', label: 'Word Document (.doc)', icon: <FileText size={16} /> },
    { id: 'pdf', label: 'PDF Document (.pdf)', icon: <File size={16} /> },
    { id: 'excel', label: 'Excel Spreadsheet (.xlsx)', icon: <FileSpreadsheet size={16} /> }
  ];
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <div className="header-icon">
            <Download size={24} />
          </div>
          <h2>Export Report</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        {/* Meeting Info */}
        <div className="meeting-info">
          <div className="meeting-title">{sheet.title}</div>
          <div className="meeting-details">
            {new Date(sheet.eventDate).toLocaleDateString()} • {sheet.location || 'ZUCA'}
          </div>
        </div>
        
        {/* Export Type Selection */}
        <div className="section">
          <div className="section-title">Report Type</div>
          <div className="export-options">
            {exportOptions.map(option => (
              <label 
                key={option.id} 
                className={`export-option ${exportType === option.id ? 'selected' : ''}`}
                style={{ borderColor: exportType === option.id ? option.color : '#e0e0e0' }}
              >
                <input
                  type="radio"
                  name="exportType"
                  value={option.id}
                  checked={exportType === option.id}
                  onChange={() => setExportType(option.id)}
                />
                <div className="option-icon" style={{ color: option.color }}>
                  {option.icon}
                </div>
                <div className="option-info">
                  <div className="option-title">{option.title}</div>
                  <div className="option-desc">{option.description}</div>
                </div>
                {exportType === option.id && (
                  <CheckCircle size={16} className="check-icon" style={{ color: option.color }} />
                )}
              </label>
            ))}
          </div>
        </div>
        
        {/* Format Selection */}
        <div className="section">
          <div className="section-title">Format</div>
          <div className="format-options">
            {formatOptions.map(option => (
              <label 
                key={option.id} 
                className={`format-option ${format === option.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="format"
                  value={option.id}
                  checked={format === option.id}
                  onChange={() => setFormat(option.id)}
                />
                {option.icon}
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Fields to Include (for full report) */}
        {exportType === 'full' && (
          <div className="section">
            <div className="section-title">Include Fields</div>
            <div className="fields-grid">
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={includeFields.name}
                  onChange={() => toggleField('name')}
                />
                <span>Name</span>
              </label>
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={includeFields.phone}
                  onChange={() => toggleField('phone')}
                />
                <span>Phone Number</span>
              </label>
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={includeFields.role}
                  onChange={() => toggleField('role')}
                />
                <span>Role</span>
              </label>
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={includeFields.time}
                  onChange={() => toggleField('time')}
                />
                <span>Check-in Time</span>
              </label>
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={includeFields.method}
                  onChange={() => toggleField('method')}
                />
                <span>Sign Method</span>
              </label>
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={includeFields.membership}
                  onChange={() => toggleField('membership')}
                />
                <span>Membership #</span>
              </label>
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={includeFields.jumuia}
                  onChange={() => toggleField('jumuia')}
                />
                <span>Jumuia</span>
              </label>
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={includeFields.notes}
                  onChange={() => toggleField('notes')}
                />
                <span>Notes</span>
              </label>
            </div>
          </div>
        )}
        
        {/* Preview Note */}
        <div className="preview-note">
          <Calendar size={14} />
          <span>Report will include ZUCA branding, event details, and footer with "Tumsifu Yesu Kristu! 🙏"</span>
        </div>
        
        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleExport} disabled={loading}>
            <Download size={16} />
            {loading ? 'Generating...' : `Export ${format.toUpperCase()}`}
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
          background: #e0e7ff;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
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
        
        .export-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .export-option {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .export-option:hover {
          background: #f8f8f8;
        }
        
        .export-option.selected {
          background: #fafafa;
          border-width: 2px;
        }
        
        .option-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .option-info {
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
        
        .check-icon {
          flex-shrink: 0;
        }
        
        .format-options {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .format-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 30px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        
        .format-option.selected {
          background: #1a1a1a;
          border-color: #1a1a1a;
          color: white;
        }
        
        .format-option input {
          display: none;
        }
        
        .fields-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        
        .field-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          cursor: pointer;
        }
        
        .field-checkbox input {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }
        
        .preview-note {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 24px 20px;
          padding: 12px;
          background: #fef3c7;
          border-radius: 10px;
          font-size: 11px;
          color: #d97706;
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