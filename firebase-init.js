import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCChNAgfuYlFlkx172xMVPABj_qyQWPup8",
  authDomain: "cnhs-inventory.firebaseapp.com",
  projectId: "cnhs-inventory",
  storageBucket: "cnhs-inventory.firebasestorage.app",
  messagingSenderId: "151852816995",
  appId: "1:151852816995:web:b39c35301aec83af06b656",
  measurementId: "G-0LWBVK62F5"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

export const authReady = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => resolve(user));
});

signInAnonymously(auth).catch(console.error);