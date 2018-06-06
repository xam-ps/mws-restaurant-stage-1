self.importScripts('js/idb.js', 'js/dbhelper.js');

var staticCacheName = 'yelplight-v0.5.23';
var contentImgsCache = 'yelplight-content-imgs';
var contentRestaurants = 'yelplight-restaurants'
var allCaches = [
    staticCacheName,
    contentImgsCache,
    contentRestaurants
];

self.addEventListener('sync', function (event) {
    if (event.tag == 'syncReviews') {
        console.log("Syncing review");
        event.waitUntil(
            DBHelper.sendToBackend()
        )
    } else if(event.tag == 'syncFavs') {
        console.log("Syncing Fav");
        event.waitUntil(
            DBHelper.sendFavsToBackend()
        )
    }
});

self.addEventListener('periodicsync', function (event) {
    if (event.registration.tag == "syncReviews") {
        console.log("Periodic sync event occurred: ", event);
        event.waitUntil(
            DBHelper.sendToBackend()
        )
    } else if(event.registration.tag == "syncFavs") {
        console.log("Periodic sync event occurred: ", event);
        event.waitUntil(
            DBHelper.sendFavsToBackend()
        )
    }
});

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(staticCacheName).then(function (cache) {
            return cache.addAll([ // takes an array fetches all and puts the request-response pairs into the cache (is atomic)
                '/',
                'index.html',
                'restaurant.html',
                'css/styles.css',
                'js/dbhelper.js',
                'js/main.js',
                'js/idb.js',
                'js/restaurant_info.js'
            ]);
        })
    );
});

self.addEventListener('activate', function (event) { // Delete old cache versions
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.filter(function (cacheName) {
                    return cacheName.startsWith('yelplight-') &&
                        !allCaches.includes(cacheName);
                }).map(function (cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', function (event) {
    // console.log(event.request.url);
    // console.log(event);
    let requestUrl = new URL(event.request.url);
    let splitPath = requestUrl.pathname.split('/');

    /* if (requestUrl.href.endsWith('/restaurants')) {
        event.respondWith(serveRestaurants(event.request));
        return;
    } 

    if ((splitPath[1] == 'restaurants') && (splitPath[2] == parseInt(splitPath[2],10))) {
        event.respondWith(serveRestaurants(event.request));
        return;
    } */

    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname === '/') {
            event.respondWith(
                caches.match('index.html') // searches in all caches for the request
            );
            return;
        }
        if (requestUrl.pathname.startsWith('/img/')) {
            event.respondWith(servePhoto(event.request));
            return;
        }
        if (requestUrl.pathname.startsWith('/restaurant.html')) {
            event.respondWith(
                caches.match('restaurant.html')
            );
            return;
        }
    }

    event.respondWith(
        caches.match(event.request).then(function (response) {
            return response || fetch(event.request);
        })
    );
});

/* function serveRestaurants(request) {
    var storageUrl = request.url;

    return caches.open(contentRestaurants).then(function (cache) {
        return cache.match(storageUrl).then(function (response) {
            if (response) return response;

            return fetch(request).then(function (networkResponse) {
                cache.put(storageUrl, networkResponse.clone());
                return networkResponse;
            }).catch(function(error){
                return new Response(-1);
            });
        });
    });
}
 */
function servePhoto(request) {
    var storageUrl = request.url;

    return caches.open(contentImgsCache).then(function (cache) {
        return cache.match(storageUrl).then(function (response) {
            if (response) return response;

            return fetch(request).then(function (networkResponse) {
                cache.put(storageUrl, networkResponse.clone());
                return networkResponse;
            });
        });
    });
}