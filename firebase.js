// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyChNAgfuYLFlkx17zxMVPABj_qyQWPup8",
  authDomain: "cnhs-inventory.firebaseapp.com",
  projectId: "cnhs-inventory",
  storageBucket: "cnhs-inventory.firebasestorage.app",
  messagingSenderId: "151852816995",
  appId: "1:151852816995:web:b39c35301aec83af06b656",
  measurementId: "G-0LWBVK62F5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore database
export const db = getFirestore(app);
