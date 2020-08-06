const indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

let db;
const request = indexedDB.open('budget', 1);

request.onupgradeneeded = (event) => {
	const db = event.target.result;
	db.createObjectStore('pending', { autoIncrement: true });
};

request.onsuccess = (event) => {
	db = event.target.result;
	//we need to check if the app in online before pushing the changes made offline to the DB
	if (navigator.onLine) {
		checkDatabase();
	}
};

request.onerror = (event) => {
	console.log(`Error: ${event.target.errorCode}`);
};

const saveRecord = (record) => {
	const transaction = db.transaction([ 'pending' ], 'readwrite');
	const store = transaction.objectStore('pending');

	store.add(record);
};

const checkDatabase = () => {
	const transaction = db.transaction([ 'pending' ], 'readwrite');
	const store = transaction.objectStore('pending');

	const getAll = store.getAll();

	getAll.onsuccess = () => {
		if (getAll.result.length > 0) {
			fetch('/api/transaction/bulk', {
				method: 'POST',
				body: JSON.stringify(getAll.result),
				headers: {
					Accept: 'application/json, text/plain, */*',
					'Content-Type': 'application/json'
				}
			})
				.then((response) => response.json())
				.then(() => {
					//delete the offline store data
					const transaction = db.transaction([ 'pending' ], 'readwrite');
					const store = transaction.objectStore('pending');
					store.clear();
				});
		}
	};
};

//listens for the budget tracker to come back online
window.addEventListener('online', checkDatabase);
