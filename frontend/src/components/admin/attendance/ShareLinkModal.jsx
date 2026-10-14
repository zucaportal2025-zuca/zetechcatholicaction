import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Calendar, Clock, MapPin, Link as LinkIcon, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../../../api';

export default function ShareLinkModal({ sheet, onClose }) {
  const [generatedLink, setGeneratedLink] = useState(null);
  const [expiryDays, setExpiryDays] = useState(7);
  const [maxUses, setMaxUses] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [activeTab, setActiveTab] = useState('generate');
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  // Generate new link
  const generateLink = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/api/attendance/sheet/${sheet.id}/generate-link`, {
        expiresInDays: expiryDays,
        maxUses: maxUses ? parseInt(maxUses) : null
      }, { headers: getHeaders() });
      
      setGeneratedLink(response.data);
      fetchLinks(); // Refresh links list
      setActiveTab('existing'); // Switch to existing links tab
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch existing links
  const fetchLinks = async () => {
    try {
      const response = await api.get(`/api/attendance/sheet/${sheet.id}/links`, {
        headers: getHeaders()
      });
      setLinks(response.data.links || []);
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoadingLinks(false);
    }
  };
  
  // Copy link to clipboard
  const copyToClipboard = () => {
    if (generatedLink?.link) {
      navigator.clipboard.writeText(generatedLink.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Copy existing link
  const copyExistingLink = (link) => {
    const fullLink = `${window.location.origin}/attendance/link/${link.token}`;
    navigator.clipboard.writeText(fullLink);
    alert('✅ Link copied to clipboard!');
  };
  
  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    if (generatedLink?.link) {
      const message = encodeURIComponent(
        `📋 *${sheet.title}* Attendance\n\n` +
        `📅 Date: ${new Date(sheet.eventDate).toLocaleDateString()}\n` +
        `🕐 Time: ${sheet.eventTime || '4:30 PM'}\n` +
        `📍 Location: ${sheet.location || 'ZUCA'}\n\n` +
        `Click the link below to check in:\n${generatedLink.link}\n\n` +
        `Valid until: ${new Date(generatedLink.expiresAt).toLocaleDateString()}`
      );
      window.open(`https://wa.me/?text=${message}`, '_blank');
    }
  };
  
  // Delete link
  const deleteLink = async (linkId) => {
    if (!confirm('Delete this link? It will no longer work.')) return;
    try {
      await api.delete(`/api/attendance/link/${linkId}`, { headers: getHeaders() });
      fetchLinks();
    } catch (error) {
      alert('Failed to delete link');
    }
  };
  
  useEffect(() => {
    fetchLinks();
  }, []);
  
  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="share-modal-header">
          <h2>🔗 Share Attendance Link</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        {/* Sheet Info */}
        <div className="share-sheet-info">
          <h3>{sheet.title}</h3>
          <div className="share-sheet-details">
            <span><Calendar size={12} /> {new Date(sheet.eventDate).toLocaleDateString()}</span>
            <span><Clock size={12} /> {sheet.eventTime || '4:30 PM'}</span>
            <span><MapPin size={12} /> {sheet.location || 'ZUCA'}</span>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="share-tabs">
          <button 
            className={`share-tab ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            🔗 Generate New Link
          </button>
          <button 
            className={`share-tab ${activeTab === 'existing' ? 'active' : ''}`}
            onClick={() => setActiveTab('existing')}
          >
            📋 Existing Links ({links.length})
          </button>
        </div>
        
        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="share-generate-tab">
            <div className="share-form-group">
              <label>Link Expiry</label>
              <select value={expiryDays} onChange={(e) => setExpiryDays(parseInt(e.target.value))}>
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days (default)</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
            
            <div className="share-form-group">
              <label>Max Uses (Optional)</label>
              <input
                type="number"
                placeholder="Leave empty for unlimited"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                min="1"
              />
              <small>Leave empty for unlimited uses</small>
            </div>
            
            <button 
              className="share-generate-btn"
              onClick={generateLink}
              disabled={loading}
            >
              {loading ? '⏳ Generating...' : '🔗 Generate Shareable Link'}
            </button>
          </div>
        )}
        
        {/* Existing Links Tab */}
        {activeTab === 'existing' && (
          <div className="share-existing-tab">
            {loadingLinks ? (
              <div className="share-loading">Loading links...</div>
            ) : links.length === 0 ? (
              <div className="share-empty">
                <LinkIcon size={32} />
                <p>No links generated yet</p>
                <button onClick={() => setActiveTab('generate')}>Create your first link</button>
              </div>
            ) : (
              <div className="share-links-list">
                {links.map((link) => (
                  <div key={link.id} className="share-link-item">
                    <div className="share-link-info">
                      <div className="share-link-token">
                        🔗 {link.token.substring(0, 16)}...
                      </div>
                      <div className="share-link-stats">
                        <span>📊 Used: {link.usedCount} / {link.maxUses || '∞'}</span>
                        <span>⏰ Expires: {new Date(link.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="share-link-actions">
                      <button 
                        className="share-copy-btn"
                        onClick={() => copyExistingLink(link)}
                      >
                        <Copy size={14} /> Copy
                      </button>
                      <button 
                        className="share-delete-btn"
                        onClick={() => deleteLink(link.id)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Generated Link Display */}
        {generatedLink && activeTab === 'generate' && (
          <div className="share-generated-link">
            <div className="share-link-label">✨ Your shareable link:</div>
            <div className="share-link-url">
              <input type="text" readOnly value={generatedLink.link} />
              <button onClick={copyToClipboard} className="share-copy-btn">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button onClick={shareViaWhatsApp} className="share-whatsapp-btn">
              <Share2 size={16} /> Share on WhatsApp
            </button>
            <div className="share-link-note">
              ⚡ This link expires on {new Date(generatedLink.expiresAt).toLocaleDateString()}
              {generatedLink.maxUses && ` • Max ${generatedLink.maxUses} uses`}
            </div>
          </div>
        )}
        
      </div>
      
      <style>{`
        .share-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        
        .share-modal {
          background: white;
          border-radius: 20px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .share-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .share-modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
        }
        
        .share-modal-header .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #64748b;
        }
        
        .share-sheet-info {
          padding: 16px 24px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .share-sheet-info h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          color: #1e293b;
        }
        
        .share-sheet-details {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #64748b;
        }
        
        .share-sheet-details span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .share-tabs {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
          padding: 0 24px;
        }
        
        .share-tab {
          padding: 12px 16px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          color: #64748b;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        
        .share-tab.active {
          color: #8b5cf6;
          border-bottom-color: #8b5cf6;
        }
        
        .share-generate-tab, .share-existing-tab {
          padding: 24px;
        }
        
        .share-form-group {
          margin-bottom: 20px;
        }
        
        .share-form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          font-size: 13px;
          color: #1e293b;
        }
        
        .share-form-group select, .share-form-group input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
        }
        
        .share-form-group select:focus, .share-form-group input:focus {
          outline: none;
          border-color: #8b5cf6;
        }
        
        .share-form-group small {
          display: block;
          margin-top: 4px;
          font-size: 11px;
          color: #64748b;
        }
        
        .share-generate-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .share-generate-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
        
        .share-generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .share-generated-link {
          margin: 0 24px 24px;
          padding: 16px;
          background: #f0fdf4;
          border-radius: 12px;
          border: 1px solid #bbf7d0;
        }
        
        .share-link-label {
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 8px;
          color: #166534;
        }
        
        .share-link-url {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .share-link-url input {
          flex: 1;
          padding: 8px 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 12px;
          font-family: monospace;
        }
        
        .share-copy-btn {
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #1e293b;
        }
        
        .share-whatsapp-btn {
          width: 100%;
          padding: 10px;
          background: #25D366;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .share-link-note {
          font-size: 11px;
          color: #166534;
          text-align: center;
        }
        
        .share-links-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 300px;
          overflow-y: auto;
        }
        
        .share-link-item {
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        
        .share-link-token {
          font-size: 11px;
          font-family: monospace;
          color: #64748b;
          margin-bottom: 6px;
        }
        
        .share-link-stats {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: #475569;
          margin-bottom: 10px;
        }
        
        .share-link-actions {
          display: flex;
          gap: 8px;
        }
        
        .share-delete-btn {
          padding: 6px 12px;
          background: #fee2e2;
          border: none;
          border-radius: 6px;
          color: #ef4444;
          font-size: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .share-empty {
          text-align: center;
          padding: 40px;
          color: #64748b;
        }
        
        .share-empty button {
          margin-top: 12px;
          padding: 8px 16px;
          background: #8b5cf6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        
        .share-loading {
          text-align: center;
          padding: 40px;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}