// src/components/NotificationManager.jsx
import React, { useState, useEffect } from 'react';
import InAppNotification from './InAppNotification';
import soundManager from '../utils/soundManager';

const NotificationManager = ({ children }) => {
  const [activeNotifications, setActiveNotifications] = useState([]);

  useEffect(() => {
    // Initialize sound manager
    soundManager.init();
    
    // Expose method to show notifications from anywhere
    window.showInAppToast = (notification) => {
      const id = Date.now();
      setActiveNotifications(prev => [...prev, { id, ...notification }]);
    };
    
    // Listen for service worker messages (for notification clicks)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
          console.log('Notification clicked from service worker:', event.data.payload);
          const payload = event.data.payload;
          
          // Navigate based on the notification data
          if (payload.url) {
            window.location.href = payload.url;
          }
        }
      });
    }
    
    // Make soundManager available globally for testing
    window.soundManager = soundManager;
  }, []);

  const removeNotification = (id) => {
    setActiveNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <>
      {children}
      {activeNotifications.map(notification => (
        <InAppNotification
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </>
  );
};

export default NotificationManager;