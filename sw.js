// Service Worker پارسیس — v50
var CACHE_NAME = 'parsis-v50';

var ASSETS = [
  './index.html',
  './manifest.json',
  './style.css',
  './01-core,db,state,digits,dates,calendar,calc.js',
  './02-ui,nav,sidebar,theme,tables,sort,columns,csv,print.js',
  './03-base,persons,companies,banks,fiscal,chart,templates.js',
  './04-vouchers,estimates,sources,facilities,installments.js',
  './05-reports,cashflow,account,trial,incomplete,facility.js',
  './06-widgets,dashboard,rates,close,sms.js',
  './07-notes,images,checklist,share,view.js',
  './08-ai,assistant,tts,tools,vision,voice.js',
  './09-settings,backup,restore,reset,init.js',
  './10-welcome,patch.js',
  './11-fixes-v29.js',
  './14-calendar-google.js',
  './15-account-review-final.js',
  './16-calendar-v37.js',
  './16-fixes-v38.js',
  './17-scan-improved.js',
  './18-calendar-v40.js',
  './19-final-v41.js',
  './20-voucher-fix.js',
  './23-share-width-fix.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function() {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

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
      fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function() {
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
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function() { return caches.match('./index.html'); });
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
