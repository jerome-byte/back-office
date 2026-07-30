import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDQvK2AJUqOl96lST2InN42buwIV7SZgpM",
  authDomain: "carnivore-4a938.firebaseapp.com",
  projectId: "carnivore-4a938",
  storageBucket: "carnivore-4a938.firebasestorage.app",
  messagingSenderId: "830635285280",
  appId: "1:830635285280:web:cd1388c5c1e0d5a54d9545",
  measurementId: "G-610BVEZRBP"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

let messaging = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.warn('⚠️ FCM non disponible (HTTPS requis):', e.message);
}

export const requestFCMToken = async () => {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const vapidKey = 'BD_4XFlp-30O6GxECpNHlCwo0tYb8Rk-TxOvzAKatxwltxb7A3sHqPnvivXrnwrvOla0cPL_vFroLEYquwohArk';
    const currentToken = await getToken(messaging, { vapidKey });
    if (currentToken) {
      console.log('✅ Token FCM:', currentToken);
      return currentToken;
    }
    return null;
  } catch (error) {
    console.warn('⚠️ FCM token échoué (normal en HTTP):', error.message);
    return null;
  }
};

export const onForegroundMessage = (callback) => {
  if (!messaging) return;
  try {
    onMessage(messaging, (payload) => callback(payload));
  } catch (e) {
    console.warn('⚠️ onForegroundMessage:', e.message);
  }
};