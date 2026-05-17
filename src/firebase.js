import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// In Vite, these can be set via a .env file:
// VITE_FIREBASE_API_KEY=...
// VITE_FIREBASE_AUTH_DOMAIN=...
// VITE_FIREBASE_PROJECT_ID=...
// VITE_FIREBASE_STORAGE_BUCKET=...
// VITE_FIREBASE_MESSAGING_SENDER_ID=...
// VITE_FIREBASE_APP_ID=...
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

let app = null;
let auth = null;
let db = null;
let storage = null;
let isDemoMode = true;

// Check if credentials are set (not empty and not placeholders)
const hasCredentials = firebaseConfig.apiKey && 
                       firebaseConfig.apiKey !== "YOUR_API_KEY" &&
                       firebaseConfig.projectId;

if (hasCredentials) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    isDemoMode = false;
    
    console.log("🌌 Nebula Notes: Firebase successfully initialized!");

    console.log("🌌 Nebula Notes: Realtime Firestore Sync Enabled (No Caching)!");

  } catch (error) {
    console.error("🌌 Nebula Notes: Firebase initialization failed. Falling back to Demo/Local Safe Mode.", error);
    isDemoMode = true;
  }
} else {
  console.log("🌌 Nebula Notes: No Firebase credentials found. Running in Local Safe Offline-First Mode (Demo Mode).");
  isDemoMode = true;
}

export { app, auth, db, storage, isDemoMode };
