// Service Worker پارسیس — v33 (پچ اصلاحات ۹گانه)
// Network-First برای HTML، Cache-First برای منابع ثابت

var CACHE_NAME = 'parsis-v33-patches';
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
  './09-settings,backup,restore,reset,init.js'
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
