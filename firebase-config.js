// Paste your Firebase Web App configuration here.
// Firebase Console > Project settings > Your apps > Web app
export const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE"
};

export const DIRECTORY_COLLECTION = "sites";

export const FIREBASE_CONFIGURED =
  firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY_HERE" &&
  firebaseConfig.projectId !== "PASTE_YOUR_PROJECT_ID_HERE";
