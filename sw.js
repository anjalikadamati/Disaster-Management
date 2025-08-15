// Service Worker for RESCUE HUB Emergency Response Platform
const CACHE_NAME = 'rescue-hub-emergency-response-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache.map(url => new Request(url, { mode: 'no-cors' })));
      })
      .catch(error => {
        console.error('Failed to cache resources:', error);
        // Cache what we can, don't fail completely
        return caches.open(CACHE_NAME).then(cache => {
          const localUrls = urlsToCache.filter(url => !url.startsWith('http'));
          return cache.addAll(localUrls);
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  // Skip cross-origin requests and chrome-extension requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.startsWith('https://unpkg.com') &&
      !event.request.url.startsWith('https://fonts.googleapis.com') &&
      !event.request.url.startsWith('https://cdnjs.cloudflare.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }

        return fetch(event.request).then(response => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return new Response(
            `
            <!DOCTYPE html>
            <html>
            <head>
              <title>RESCUE HUB - Offline</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 50px;
                  background: #1e3a8a;
                  color: white;
                }
                .rescue-logo {
                  font-size: 4rem;
                  margin-bottom: 2rem;
                }
                h1 { font-size: 2rem; margin-bottom: 1rem; }
                p { font-size: 1.1rem; opacity: 0.9; }
              </style>
            </head>
            <body>
              <div class="rescue-logo">🛡️</div>
              <h1>RESCUE HUB</h1>
              <h2>You're offline</h2>
              <p>Please check your internet connection and try again.</p>
              <p>Your data is safely stored locally and will sync when you're back online.</p>
            </body>
            </html>
            `,
            {
              headers: { 'Content-Type': 'text/html' }
            }
          );
        }
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // In a real implementation, this would sync offline data with a server
  console.log('Background sync triggered');
}

// Push notifications (for future implementation)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: 'beacon-notification',
      data: data,
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});