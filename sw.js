// Service Worker پارسیس — v3
// تغییرات: استراتژی Network-First برای HTML (تا آپدیت‌ها فوری بیان)
//          و Cache-First برای منابع ثابت (سرعت بالا)

var CACHE_NAME = 'parsis-v3';
var ASSETS = [
  './index.html',
  './manifest.json'
];

// نصب: پاک کردن کش قدیمی و ساخت کش جدید
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function() {});
    })
  );
  self.skipWaiting();
});

// فعال‌سازی: پاک کردن تمام کش‌های قبلی
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// استراتژی fetch
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  var isHTML = event.request.mode === 'navigate'
            || (event.request.headers.get('accept') || '').indexOf('text/html') !== -1
            || url.pathname.endsWith('.html')
            || url.pathname === '/' 
            || url.pathname.endsWith('/');

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(function() {
          return caches.match(event.request).then(function(cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match('./index.html');
      });
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
