// frontend/src/utils/offlineStorage.js

import axios from 'axios';

// Get the backend URL - same logic as api.js
const getBaseUrl = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (hostname === 'localhost') {
    return 'http://localhost:5000';
  }
  return 'https://zuca-backend-iw9p.onrender.com';
};

const BASE_URL = getBaseUrl();

// Create axios instance for offline sync
const syncApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token interceptor
syncApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== INDEXEDDB HELPERS ====================

// Open IndexedDB for storing offline check-ins
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zuca_offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingCheckins')) {
        db.createObjectStore('pendingCheckins', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offlineData')) {
        db.createObjectStore('offlineData', { keyPath: 'key' });
      }
    };
  });
};

// ==================== OFFLINE CHECK-IN FUNCTIONS ====================

// Save offline check-in
export const saveOfflineCheckin = async (sheetId, deviceId, deviceName) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['pendingCheckins'], 'readwrite');
    const store = transaction.objectStore('pendingCheckins');
    
    const checkin = {
      id: Date.now(),
      sheetId,
      deviceId,
      deviceName: deviceName || 'Offline Check-in',
      timestamp: new Date().toISOString(),
      synced: false
    };
    
    store.add(checkin);
    console.log('💾 Offline check-in saved:', checkin);
    return checkin;
  } catch (error) {
    console.error('Failed to save offline check-in:', error);
    return null;
  }
};

// Get all pending check-ins
export const getPendingCheckins = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pendingCheckins'], 'readonly');
      const store = transaction.objectStore('pendingCheckins');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get pending check-ins:', error);
    return [];
  }
};

// Remove a synced check-in
export const removePendingCheckin = async (id) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['pendingCheckins'], 'readwrite');
    const store = transaction.objectStore('pendingCheckins');
    store.delete(id);
    console.log('🗑️ Removed synced check-in:', id);
  } catch (error) {
    console.error('Failed to remove check-in:', error);
  }
};

// Get pending count
export const getPendingCount = async () => {
  const pending = await getPendingCheckins();
  return pending.length;
};

// Clear all pending check-ins (for testing)
export const clearAllPendingCheckins = async () => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['pendingCheckins'], 'readwrite');
    const store = transaction.objectStore('pendingCheckins');
    store.clear();
    console.log('🗑️ All pending check-ins cleared');
  } catch (error) {
    console.error('Failed to clear check-ins:', error);
  }
};

// ==================== OFFLINE DATA CACHING ====================

// Save offline data (like active sheets)
export const saveOfflineData = async (key, data) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(['offlineData'], 'readwrite');
    const store = transaction.objectStore('offlineData');
    store.put({ key, data, timestamp: Date.now() });
    console.log('💾 Offline data saved:', key);
  } catch (error) {
    console.error('Failed to save offline data:', error);
  }
};

// Get offline data
export const getOfflineData = async (key) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get offline data:', error);
    return null;
  }
};

// ==================== SYNC FUNCTION ====================
// Sync all pending check-ins when back online
export const syncOfflineCheckins = async () => {
  const pending = await getPendingCheckins();
  
  if (pending.length === 0) return { synced: 0, failed: 0 };
  
  console.log(`🔄 Syncing ${pending.length} offline check-in(s)...`);
  
  let synced = 0;
  let failed = 0;
  
  for (const checkin of pending) {
    try {
      const response = await syncApi.post('/api/attendance/self-checkin', {
        sheetId: checkin.sheetId,
        deviceId: checkin.deviceId,
        deviceName: `${checkin.deviceName} (Synced)`
      });
      
      if (response.data.success) {
        await removePendingCheckin(checkin.id);
        synced++;
        console.log(`✅ Synced check-in for sheet: ${checkin.sheetId}`);
      } else {
        failed++;
      }
    } catch (error) {
      const errorData = error.response?.data;
      
      // ✅ If device already used or already checked in, remove from pending (don't retry)
      if (errorData?.error === 'DEVICE_ALREADY_USED' || 
          errorData?.error === 'ALREADY_CHECKED_IN') {
        await removePendingCheckin(checkin.id);
        console.log(`🗑️ Removed ${checkin.sheetId} - ${errorData.error}`);
        synced++; // Count as handled
      } else {
        failed++;
        console.error(`❌ Failed to sync check-in ${checkin.id}:`, errorData?.message || error.message);
      }
    }
  }
  
  console.log(`📊 Sync complete: ${synced} synced/handled, ${failed} failed`);
  return { synced, failed };
};
