// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCChNAgfuYlFlkx172xMVPABj_qyQWPup8",
  authDomain: "cnhs-inventory.firebaseapp.com",
  projectId: "cnhs-inventory",
  storageBucket: "cnhs-inventory.firebasestorage.app",
  messagingSenderId: "151852816995",
  appId: "1:151852816995:web:b39c35301aec83af06b656",
  measurementId: "G-0LWBVK62F5"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ✅ para hindi nawawala login pag lipat ng page
await setPersistence(auth, browserLocalPersistence);

// ✅ authReady: resolve when auth state is known
export const authReady = new Promise((resolve) => {
  const unsub = auth.onAuthStateChanged(() => {
    unsub();
    resolve();
  });
});

