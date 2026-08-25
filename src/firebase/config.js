import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDZYp0Htdo7i5KH5pG8oot6mbqEeNvwXC8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ems-a90db.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ems-a90db",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ems-a90db.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "819364672657",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:819364672657:web:f50a4c346a1ace596cfb30",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-TV9GRHN6Y9"
};

export const isFirebaseConfigured = true;

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

