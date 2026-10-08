// Service Worker پارسیس — v2
// تغییرات: استراتژی Network-First برای HTML (تا آپدیت‌ها فوری بیان)
//          و Cache-First برای منابع ثابت (سرعت بالا)

var CACHE_NAME = 'parsis-v2';
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
  self.skipWaiting(); // فعال‌سازی فوری SW جدید
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
      return self.clients.claim(); // کنترل فوری همه‌ی تب‌ها
    })
  );
});

// استراتژی fetch:
// - برای HTML و درخواست‌های ناوبری: Network-First (تا آپدیت فوری بیاد)
// - برای بقیه: Cache-First (سرعت)
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  // فقط درخواست‌های هم‌دامنه رو کش کن (نه API ها)
  if (url.origin !== self.location.origin) {
    return; // بذار مرورگر خودش هندل کنه
  }

  var isHTML = event.request.mode === 'navigate'
            || (event.request.headers.get('accept') || '').indexOf('text/html') !== -1
            || url.pathname.endsWith('.html')
            || url.pathname === '/' 
            || url.pathname.endsWith('/');

  if (isHTML) {
    // Network-First برای HTML
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
          // آفلاین: از کش بخون
          return caches.match(event.request).then(function(cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Cache-First برای بقیه‌ی منابع
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

// گوش دادن به پیام SKIP_WAITING از صفحه (اختیاری — برای آپدیت دستی)
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
