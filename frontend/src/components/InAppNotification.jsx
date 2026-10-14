// src/components/NotificationManager.jsx
import React, { useState, useEffect } from 'react';
import InAppNotification from './InAppNotification';

const NotificationManager = ({ children }) => {
  const [activeNotifications, setActiveNotifications] = useState([]);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  // Helper: Convert VAPID key from base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Show in-app notification (uses your existing component)
  const showInAppNotification = (notification) => {
    const id = Date.now() + Math.random();
    setActiveNotifications(prev => [...prev, { 
      id, 
      ...notification,
      createdAt: notification.createdAt || new Date().toISOString()
    }]);
    
    // Auto-remove after duration
    const duration = notification.duration || 5000;
    setTimeout(() => {
      setActiveNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  };

  // Subscribe to push notifications
  const subscribeToPush = async () => {
    if (!isPushSupported) {
      showInAppNotification({
        title: 'Not Supported',
        message: 'Your browser does not support push notifications',
        type: 'error',
        duration: 3000
      });
      return false;
    }

    setSubscriptionLoading(true);
    
    try {
      // Request permission if not granted
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Please allow notifications to receive updates');
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from backend
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/notifications/vapid-public-key`);
      const { publicKey } = await response.json();

      if (!publicKey) {
        throw new Error('Server configuration error');
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to backend
      const token = localStorage.getItem('authToken');
      const subscribeResponse = await fetch(`${apiUrl}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription })
      });

      if (!subscribeResponse.ok) {
        throw new Error('Failed to save subscription on server');
      }

      setIsPushSubscribed(true);
      
      // Show success notification
      showInAppNotification({
        title: '🔔 Notifications Enabled',
        message: 'You will now receive updates even when the app is closed!',
        type: 'success',
        duration: 3000
      });
      
      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      
      showInAppNotification({
        title: 'Failed to Enable Notifications',
        message: error.message || 'Please check your browser permissions',
        type: 'error',
        duration: 4000
      });
      
      return false;
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribeFromPush = async () => {
    if (!isPushSupported) return false;

    setSubscriptionLoading(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Tell backend to remove subscription
        const token = localStorage.getItem('authToken');
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        
        await fetch(`${apiUrl}/api/notifications/unsubscribe`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setIsPushSubscribed(false);
        
        showInAppNotification({
          title: 'Notifications Disabled',
          message: 'You will no longer receive push notifications',
          type: 'info',
          duration: 3000
        });
        
        return true;
      }
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      showInAppNotification({
        title: 'Error',
        message: 'Failed to disable notifications',
        type: 'error',
        duration: 3000
      });
      return false;
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Initialize on mount
  useEffect(() => {
    // Check push support
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsPushSupported(supported);
    
    // Expose method to show notifications from anywhere (for push service worker)
    window.showInAppToast = showInAppNotification;
    
    // Listen for service worker messages (for notification clicks)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
          console.log('Notification clicked from service worker:', event.data.payload);
          const payload = event.data.payload;
          
          // Navigate based on the notification data
          if (payload.url) {
            // Use React Router if available
            if (window.navigate) {
              window.navigate(payload.url);
            } else {
              window.location.href = payload.url;
            }
          }
        }
      });
    }
    
    // Auto-subscribe if user is logged in and permission already granted
    const autoSubscribeIfGranted = async () => {
      if (supported && Notification.permission === 'granted') {
        const token = localStorage.getItem('authToken');
        if (token) {
          try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
              console.log('Auto-subscribing to push...');
              await subscribeToPush();
            } else {
              setIsPushSubscribed(true);
            }
          } catch (error) {
            console.error('Auto-subscribe check failed:', error);
          }
        }
      }
    };
    
    autoSubscribeIfGranted();
    
    // Make push functions available globally
    window.pushManager = {
      subscribe: subscribeToPush,
      unsubscribe: unsubscribeFromPush,
      isSubscribed: () => isPushSubscribed
    };
    
  }, []); // Empty dependency array

  const removeNotification = (id) => {
    setActiveNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Clone children to pass push props if needed
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        isPushSupported,
        isPushSubscribed,
        subscriptionLoading,
        onSubscribePush: subscribeToPush,
        onUnsubscribePush: unsubscribeFromPush
      });
    }
    return child;
  });

  return (
    <>
      {childrenWithProps}
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