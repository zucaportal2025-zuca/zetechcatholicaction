import badgeManager from '../utils/badgeManager';
import BASE_URL from '../api';

class PushNotificationService {
  constructor() {
    this.swRegistration = null;
    this.vapidPublicKey = null;
    this.permission = 'default';
    this.notificationCallbacks = [];
    this.isSubscribed = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  onNotification(callback) {
    this.notificationCallbacks.push(callback);
    return () => {
      this.notificationCallbacks = this.notificationCallbacks.filter(cb => cb !== callback);
    };
  }

  handleInAppNotification(notification) {
    badgeManager.increment();

    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (err) {
        console.error(err);
      }
    });

    window.dispatchEvent(
      new CustomEvent('new-notification', { detail: notification })
    );
  }

  setupInAppNotifications() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data || {};

      if (type === 'NOTIFICATION_CLICK' && data?.url) {
        window.location.href = data.url;
      }

      if (type === 'GAME_INVITE_ACCEPTED') {
        window.dispatchEvent(
          new CustomEvent('acceptGameInvite', { detail: data })
        );
      }
    });

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'REGISTER_CLIENT',
        userId: localStorage.getItem('userId')
      });
    }
  }

  async init() {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications/vapid-public-key`);
      const data = await res.json();

      this.vapidPublicKey = data.publicKey;

      this.setupInAppNotifications();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) return false;

    const permission = await Notification.requestPermission();
    this.permission = permission;

    return permission === 'granted';
  }

  // =========================
  // CLEAN SERVICE WORKER REG
  // =========================
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return false;

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      await navigator.serviceWorker.ready;

      console.log('✅ SW registered & ready');

      return true;
    } catch (err) {
      console.error('SW error:', err);
      return false;
    }
  }

  async subscribe() {
    if (!this.swRegistration) {
      const ok = await this.registerServiceWorker();
      if (!ok) return false;
    }

    if (!this.vapidPublicKey) {
      const ok = await this.init();
      if (!ok) return false;
    }

    try {
      let sub = await this.swRegistration.pushManager.getSubscription();

      if (!sub) {
        const key = this.urlBase64ToUint8Array(this.vapidPublicKey);

        sub = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key
        });

        this.isSubscribed = true;
      }

      const token = localStorage.getItem('token');
      if (!token) return false;

      await fetch(`${BASE_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ subscription: sub })
      });

      await badgeManager.loadCount();

      return true;
    } catch (err) {
      console.error('subscribe error:', err);
      return false;
    }
  }

  async unsubscribe() {
    if (!this.swRegistration) return;

    try {
      const sub = await this.swRegistration.pushManager.getSubscription();

      if (sub) await sub.unsubscribe();

      const token = localStorage.getItem('token');

      if (token) {
        await fetch(`${BASE_URL}/api/notifications/unsubscribe`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }

      this.isSubscribed = false;
      await badgeManager.updateBadgeCount(0);

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  async setupForUser() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    await this.init();
    await this.registerServiceWorker();

    const granted = await this.requestPermission();

    if (granted) {
      await this.subscribe();
      return true;
    }

    return false;
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);

    for (let i = 0; i < raw.length; i++) {
      arr[i] = raw.charCodeAt(i);
    }

    return arr;
  }
}

export default new PushNotificationService();