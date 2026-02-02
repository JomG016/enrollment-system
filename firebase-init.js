// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// ✅ ADDED: anon sign-in import
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js"; // ✅ ADDED

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

// ✅ ADDED: ensure anonymous auth exists (so Firestore writes always have request.auth)
export async function ensureAnonAuth() { // ✅ ADDED
  try { // ✅ ADDED
    if (!auth.currentUser) { // ✅ ADDED
      await signInAnonymously(auth); // ✅ ADDED
    } // ✅ ADDED
  } catch (e) { // ✅ ADDED
    console.error("ensureAnonAuth failed:", e); // ✅ ADDED
    // throw e; // ✅ ADDED (optional) keep commented so pages won't crash hard
  } // ✅ ADDED
} // ✅ ADDED

// ✅ ADDED: kick off anon auth early (non-blocking)
ensureAnonAuth(); // ✅ ADDED

// ✅ authReady: resolve when auth state is known
export const authReady = new Promise((resolve) => {
  const unsub = auth.onAuthStateChanged(() => {
    unsub();
    resolve();
  });
});

// ✅ ADDED: stronger ready (waits until signed in OR attempted)
export const authSignedInReady = (async () => { // ✅ ADDED
  await authReady; // ✅ ADDED
  await ensureAnonAuth(); // ✅ ADDED
})(); // ✅ ADDED
