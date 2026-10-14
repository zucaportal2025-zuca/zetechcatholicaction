// ================== ZUCA SERVICE WORKER ==================
const CACHE_NAME = 'zuca-v5';
const SYNC_TAG = 'sync-checkins';

// URLs to cache on install
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

// ================== INSTALL ==================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(urlsToCache);
    })
  );
  
  self.skipWaiting();
});

// ================== ACTIVATE ==================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  event.waitUntil(self.clients.claim());
});

// ================== BACKGROUND SYNC ==================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncPendingCheckins());
  }
});

async function syncPendingCheckins() {
  console.log('[SW] Starting background sync...');
  
  try {
    const db = await openDB();
    const pending = await getPendingCheckinsFromDB(db);
    
    if (pending.length === 0) {
      console.log('[SW] No pending check-ins to sync');
      return;
    }
    
    console.log(`[SW] Syncing ${pending.length} pending check-ins...`);
    
    const token = await getTokenFromCache();
    if (!token) {
      console.log('[SW] No auth token available');
      return;
    }
    
    let synced = 0;
    
    for (const checkin of pending) {
      try {
        const response = await fetch('https://zuca-backend-iw9p.onrender.com/api/attendance/self-checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            sheetId: checkin.sheetId,
            deviceId: checkin.deviceId,
            deviceName: `${checkin.deviceName} (Background Sync)`
          })
        });
        
        if (response.ok) {
          await removePendingCheckinFromDB(db, checkin.id);
          synced++;
          console.log(`[SW] ✅ Synced: ${checkin.sheetId}`);
        }
      } catch (error) {
        console.error(`[SW] Failed to sync ${checkin.sheetId}:`, error);
      }
    }
    
    console.log(`[SW] Background sync complete: ${synced} synced`);
    
    // Notify all open windows
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        synced: synced
      });
    });
    
    if (synced > 0) {
      await showSyncNotification(synced, pending.length);
    }
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// ================== INDEXEDDB HELPERS FOR SW ==================
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zuca_offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getPendingCheckinsFromDB(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingCheckins', 'readonly');
    const store = tx.objectStore('pendingCheckins');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function removePendingCheckinFromDB(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingCheckins', 'readwrite');
    const store = tx.objectStore('pendingCheckins');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getTokenFromCache() {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match('/auth-token');
  if (response) {
    const data = await response.json();
    return data.token;
  }
  return null;
}

async function showSyncNotification(synced, total) {
  await self.registration.showNotification('✅ ZUCA Attendance Synced', {
    body: `${synced} of ${total} offline check-in(s) have been synced.`,
    icon: '/android-chrome-192x192.png',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: { url: '/member/attendance' }
  });
}

// ================== FETCH (Offline Support) ==================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 🔴 ADD THIS: For HTML pages - allow offline loading
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.open(CACHE_NAME).then((cache) => {
          return cache.match('/index.html');
        });
      })
    );
    return;
  }
  // Cache auth token when user logs in
if (url.pathname.includes('/api/login') && event.request.method === 'POST') {
  event.respondWith(
    fetch(event.request).then(async (response) => {
      // ✅ ADD THIS TRY-CATCH (3 lines)
      try {
        const clone = response.clone();
        const data = await clone.json();
        if (data.token) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/auth-token', new Response(JSON.stringify({ token: data.token })));
        }
      } catch (err) {
        // If JSON parsing fails (like HTML error page), just log and continue
        console.log('[SW] Could not cache auth token (not JSON response)');
      }
      return response;
    })
  );
  return;
}
  
  // Cache attendance API requests for offline use
  if (url.pathname.includes('/api/attendance/active') || 
      url.pathname.includes('/api/attendance/sheet/')) {
    
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(event.request);
          cache.put(event.request, response.clone());
          return response;
        } catch (error) {
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) {
            console.log('[SW] Serving cached attendance data');
            return cachedResponse;
          }
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'You are offline. Please check your connection.',
            offline: true 
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })
    );
    return;
  }
  
  // For static assets (JS, CSS, images)
  if (event.request.method === 'GET' && 
      (url.pathname.includes('.js') || 
       url.pathname.includes('.css') || 
       url.pathname.includes('.png') || 
       url.pathname.includes('.jpg') ||
       url.pathname.includes('.jpeg') ||
       url.pathname.includes('.svg') ||
       url.pathname.includes('.webp') ||
       url.pathname.includes('.ico'))) {
    
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }
});

// ================== PUSH NOTIFICATIONS ==================
self.addEventListener('push', (event) => {
  console.log('[SW] 🔔 Push received');
  
  let title = 'ZUCA Portal';
  let options = {
    body: 'New notification',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    silent: false,
    data: { url: '/' }
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      options.body = payload.body || options.body;
      options.data = {
  ...(payload.data || {}),
  url: payload.data?.url || payload.url || '/'
};
    } catch (err) {
      options.body = event.data.text() || options.body;
    }
  }
  
  event.waitUntil(self.registration.showNotification(title, options));
});

// ================== NOTIFICATION CLICK ==================
const NOTIFICATION_URLS = {
  // 📢 Announcements
  'announcement': '/announcements',
  
  // 🎮 Games
  'game_invite': '/games',
  
  // 💰 Contributions & Payments
  'contribution': '/contributions',
  'pledge_approved': '/contributions',
  'payment_added': '/contributions',
  'payment_success': '/contributions',
  'payment_received': '/contributions',
  'payment_failed': '/contributions',
  'jumuia_payment': '/contributions',
  
  // ⛪ Mass Programs
  'program': '/mass-programs',
  
  // 📅 Schedules & Events
  'schedule': '/schedules',
  'event_reminder': '/mass-programs',
  
  // 📋 Meeting Minutes
  'meeting_minutes_published': '/minutes',
  'meeting_minutes_comment': '/minutes',
  
  // 💬 Chat & Messenger
  'chat_mention': '/chat',
  'message': '/messenger',
  
  // 👑 Executive
  'executive_appointment': '/executive',
  'executive_removed': '/executive',
  
  // 📸 Gallery
  'new_media': '/gallery',
  'media_comment': '/gallery',
  
  // 👤 User
  'user_login': '/dashboard',
  'role_change': '/dashboard',
  
  // 📋 Treasurer
  'treasurer_note': '/treasurer/notes',
  'treasurer_report': '/treasurer/reports',
  
  // 🏠 Jumuia
  'jumuia_announcement': '/announcements',
  'jumuia_contribution': '/contributions',
  
  // 🔔 Test
  'test': '/dashboard',
  
  // 🎯 Default (fallback)
  'default': '/dashboard'
};

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil((async () => {

    const windows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    console.log("ALL CLIENTS");
    windows.forEach(c => {
      console.log({
        url: c.url,
        focused: c.focused,
        visibilityState: c.visibilityState
      });
    });

    // Find a real page
   const client = windows.find(c =>
  c.url.startsWith(self.location.origin) &&
  !c.url.endsWith("/sw.js")
);

  if (client) {
  await client.focus();

  client.postMessage({
    type: "OPEN_URL",
    url
  });

  return;
}

    return self.clients.openWindow(url);

  })());
});
// ================== PUSH SUBSCRIPTION CHANGE ==================
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
});