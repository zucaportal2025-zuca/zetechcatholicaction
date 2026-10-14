import React, { useState } from 'react';
import { CheckCircle, Loader } from 'lucide-react';

export default function CheckInButton({ sheetId, onCheckin, isCheckedIn, variant = 'full' }) {
  const [loading, setLoading] = useState(false);
  
  const handleClick = async () => {
    if (isCheckedIn || loading) return;
    setLoading(true);
    try {
      await onCheckin(sheetId);
    } finally {
      setLoading(false);
    }
  };
  
  if (isCheckedIn) {
    return (
      <button className="checkin-btn checked-in" disabled>
        <CheckCircle size={16} /> Already Checked In
      </button>
    );
  }
  
  if (variant === 'small') {
    return (
      <button className="checkin-btn-small" onClick={handleClick} disabled={loading}>
        {loading ? <Loader size={14} className="spin" /> : '✓ Check In'}
      </button>
    );
  }
  
  return (
    <button className="checkin-btn" onClick={handleClick} disabled={loading}>
      {loading ? <Loader size={18} className="spin" /> : <CheckCircle size={18} />}
      {loading ? 'Checking in...' : 'Check Myself In'}
    </button>
  );
}