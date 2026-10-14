import { useState, useEffect } from 'react';
import { usePWAUpdate } from '../hooks/usePWAUpdate';

function UpdateNotification() {
  const { updateAvailable, reloadRequired } = usePWAUpdate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      setShow(true);
      setTimeout(() => setShow(false), 15000);
    }
  }, [updateAvailable]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: 'white',
      padding: '16px 24px',
      borderRadius: '16px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      maxWidth: '90%',
      animation: 'slideUp 0.3s ease'
    }}>
      <span style={{ fontSize: '20px' }}>🔄</span>
      <div>
        <div style={{ fontWeight: '600', fontSize: '14px' }}>
          New Update Available!
        </div>
        <div style={{ fontSize: '12px', opacity: 0.9 }}>
          Tap refresh to get the latest version
        </div>
      </div>
      {reloadRequired && (
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: '600',
            color: '#3b82f6',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      )}
    </div>
  );
}

export default UpdateNotification;