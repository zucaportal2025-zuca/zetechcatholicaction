import React, { useState, useEffect } from 'react';
import { X, Download, Printer, RefreshCw, Calendar, MapPin, Clock } from 'lucide-react';
import { api } from '../../../api';

export default function QRCodeModal({ sheet, onClose }) {
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sheetInfo, setSheetInfo] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };
  
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };
  
  const generateQRCode = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/attendance/sheet/${sheet.id}/qr`, { headers: getHeaders() });
      setQrCodeUrl(response.data.qrCodeUrl);
      setSheetInfo(response.data.sheet);
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to generate QR code', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.download = `QR_${sheet.title.replace(/[^a-z0-9]/gi, '_')}.png`;
    link.href = qrCodeUrl;
    link.click();
    showToast('QR Code downloaded!', 'success');
  };
  
  const printQRCode = () => {
    if (!qrCodeUrl) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${sheet.title}</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 20px;
            }
            img {
              width: 300px;
              height: 300px;
            }
            h2 {
              margin-top: 20px;
            }
            .details {
              margin-top: 10px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${qrCodeUrl}" />
            <h2>${sheet.title}</h2>
            <div class="details">
              ${new Date(sheet.eventDate).toLocaleDateString()} at ${sheet.eventTime || '4:30 PM'}<br>
              ${sheet.location || 'ZUCA'}
            </div>
            <p>Scan to check in</p>
          </div>
        </body>
      </html>
    `);
    printWindow.print();
    printWindow.close();
  };
  
  useEffect(() => {
    generateQRCode();
  }, [sheet.id]);
  
  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-container" onClick={e => e.stopPropagation()}>
        
        {toast.show && (
          <div className={`qr-toast ${toast.type}`}>{toast.message}</div>
        )}
        
        <div className="qr-modal-header">
          <h3>📱 Check-in QR Code</h3>
          <button className="qr-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="qr-modal-body">
          {loading ? (
            <div className="qr-loading">
              <div className="qr-spinner"></div>
              <p>Generating QR Code...</p>
            </div>
          ) : (
            <>
              <div className="qr-code-display">
                <img src={qrCodeUrl} alt="QR Code" />
              </div>
              
              <div className="qr-meeting-info">
                <h4>{sheetInfo?.title || sheet.title}</h4>
                <div className="qr-meta">
                  <span><Calendar size={14} /> {new Date(sheet.eventDate).toLocaleDateString()}</span>
                  <span><Clock size={14} /> {sheet.eventTime || '4:30 PM'}</span>
                  <span><MapPin size={14} /> {sheet.location || 'ZUCA'}</span>
                </div>
              </div>
              
              <div className="qr-instructions">
                <p>📸 Members can scan this QR code using their phone camera to check in</p>
                <p>⏰ Valid until meeting ends</p>
                <p>🔄 You can regenerate anytime while sheet is active</p>
              </div>
              
              <div className="qr-actions">
                <button className="qr-download-btn" onClick={downloadQRCode}>
                  <Download size={16} /> Download
                </button>
                <button className="qr-print-btn" onClick={printQRCode}>
                  <Printer size={16} /> Print
                </button>
                <button className="qr-refresh-btn" onClick={generateQRCode}>
                  <RefreshCw size={16} /> Regenerate
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      <style>{`
        .qr-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        
        .qr-modal-container {
          background: white;
          border-radius: 24px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .qr-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .qr-modal-header h3 {
          margin: 0;
          font-size: 18px;
        }
        
        .qr-close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }
        
        .qr-modal-body {
          padding: 24px;
          text-align: center;
        }
        
        .qr-code-display {
          background: white;
          padding: 16px;
          border-radius: 16px;
          margin-bottom: 20px;
        }
        
        .qr-code-display img {
          width: 200px;
          height: 200px;
          margin: 0 auto;
        }
        
        .qr-meeting-info {
          margin-bottom: 16px;
        }
        
        .qr-meeting-info h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
        }
        
        .qr-meta {
          display: flex;
          justify-content: center;
          gap: 16px;
          font-size: 12px;
          color: #666;
          flex-wrap: wrap;
        }
        
        .qr-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .qr-instructions {
          background: #f8fafc;
          padding: 12px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 12px;
          color: #64748b;
          text-align: left;
        }
        
        .qr-instructions p {
          margin: 6px 0;
        }
        
        .qr-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .qr-download-btn, .qr-print-btn, .qr-refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          border: none;
        }
        
        .qr-download-btn {
          background: #1a1a1a;
          color: white;
        }
        
        .qr-print-btn {
          background: #f0f0f0;
          color: #1a1a1a;
        }
        
        .qr-refresh-btn {
          background: #e0f2fe;
          color: #0284c7;
        }
        
        .qr-loading {
          text-align: center;
          padding: 40px;
        }
        
        .qr-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f0f0f0;
          border-top-color: #1a1a1a;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        
        .qr-toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 8px;
          background: #1a1a1a;
          color: white;
          font-size: 13px;
          z-index: 2100;
        }
        
        .qr-toast.error {
          background: #ef4444;
        }
        
        .qr-toast.success {
          background: #22c55e;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}