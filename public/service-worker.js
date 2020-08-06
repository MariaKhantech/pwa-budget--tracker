const FILES_TO_CACHE = [
	'/',
	'/index.html',
	'/index.js',
	'/db.js',
	'/style.css',
	'/icons/icon-192x192',
	'/icons/icon-512x512.png',
	'/manifest.webmanifest'
];

// the name of the cache we are going to use for storing our static assets
const CACHE_NAME = 'static-cache-v1';
// the name of the cache we are going to use for storing responses to API requests
const DATA_CACHE_NAME = 'data-cache-v1';

self.addEventListener('install', (evt) => {
	//wait for the cache to open and add the files to the cache
	evt.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			// add all of the files that we want to cache into the static file cache
			console.log('adding files to cache');
			cache.addAll(FILES_TO_CACHE);
		})
	);
	self.skipWaiting();
});

//clean up old cache from  the previous service worker
self.addEventListener('activate', (evt) => {
	// tell the service worker to wait until all of this is finished
	evt.waitUntil(
		// we're getting ALL of the items from the cache by their key
		caches.keys().then((keyList) => {
			return Promise.all(
				// we're mapping over all of the keys from the cache
				keyList.map((key) => {
					// if the key does not match the current CACHE_NAME and the DATA_CACHE_NAME
					// then it is an older cache and we don't need it anymore.
					if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
						console.log('Removing old cache data', key);
						return caches.delete(key);
					}
				})
			);
		})
	);

	self.clients.claim();
});

//handle fetching a resource
self.addEventListener('fetch', (evt) => {
	// check if the request includes "/api/" in the URL, if it does we know this is an API call
	if (evt.request.url.includes('/api/')) {
		evt.respondWith(
			// open up the DATA_CACHE, and actually make the request out to the server
			caches
				.open(DATA_CACHE_NAME)
				.then((cache) => {
					return fetch(evt.request)
						.then((response) => {
							// If the response was good, clone it and store it in the cache.
							if (response.status === 200) {
								// save the request in the cache for this particular URL
								cache.put(evt.request.url, response.clone());
							}

							// return the response into the cache
							return response;
						})
						.catch((err) => {
							// try to get a response from the DATA_CACHE for this request
							return cache.match(evt.request);
						});
				})
				.catch((err) => {
					// if an error was thrown opening the cache, or at any other point
					console.log(err);
				})
		);

		// we return here so that the code below this will not be run if the request
		// contained "/api/" in the URL
		return;
	}

	// if the request did not contain "api" in the URL, then this request was
	// probably for a static asset, so we're going to check the static cache
	evt.respondWith(
		// open up the static cache, and once that is open
		caches.open(CACHE_NAME).then((cache) => {
			// check if the item we are trying to fetch is in the cache
			return cache.match(evt.request).then((response) => {
				// if the cache returned a response, return that, otherwise actually
				// fetch the resource from the server
				return response || fetch(evt.request);
			});
		})
	);
});
