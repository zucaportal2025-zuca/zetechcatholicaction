// src/components/PushNotificationToggle.jsx
import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader } from 'lucide-react';

const PushNotificationToggle = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if (supported && window.pushManager) {
      // Check initial state
      const checkState = async () => {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      };
      checkState();
    }
  }, []);

  const handleToggle = async () => {
    if (!isSupported || !window.pushManager) return;
    
    setLoading(true);
    
    if (isSubscribed) {
      await window.pushManager.unsubscribe();
      setIsSubscribed(false);
    } else {
      await window.pushManager.subscribe();
      // Check again after subscribe
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    }
    
    setLoading(false);
  };

  if (!isSupported) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
        ${isSubscribed 
          ? 'bg-green-600 hover:bg-green-700 text-white' 
          : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      title={isSubscribed ? 'Disable notifications' : 'Enable notifications'}
    >
      {loading ? (
        <Loader size={18} className="animate-spin" />
      ) : isSubscribed ? (
        <Bell size={18} />
      ) : (
        <BellOff size={18} />
      )}
      <span className="text-sm hidden sm:inline">
        {loading ? '...' : (isSubscribed ? 'Notifications ON' : 'Enable Notifications')}
      </span>
    </button>
  );
};

export default PushNotificationToggle;