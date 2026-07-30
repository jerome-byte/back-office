importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDQvK2AJUqOl96lST2InN42buwIV7SZgpM",
  authDomain: "carnivore-4a938.firebaseapp.com",
  projectId: "carnivore-4a938",
  storageBucket: "carnivore-4a938.firebasestorage.app",
  messagingSenderId: "830635285280",
  appId: "1:830635285280:web:cd1388c5c1e0d5a54d9545",
  measurementId: "G-610BVEZRBP"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Carnivore';
  self.registration.showNotification(notificationTitle, {
    body: payload.notification?.body || '',
    icon: '/favicon.ico',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window' }).then((list) => {
    for (const client of list) {
      if (client.url.includes('localhost') && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow('/');
  }));
});