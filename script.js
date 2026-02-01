import { db, auth } from "./firebase-init.js";
import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ✅ Ensure may auth user (anonymous) para pumasa sa Firestore rules: request.auth != null
const authReady = new Promise((resolve) => {
  const unsub = onAuthStateChanged(auth, (user) => {
    if (user) { unsub(); resolve(user); }
  });
});

async function ensureAnonAuth(){
  if (auth.currentUser) return auth.currentUser;
  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.error("Anon auth failed:", e);
  }
  return authReady;
}


const form = document.getElementById("enrollmentForm") || document.querySelector("form");

const norm = (s) => (s || "").toString().trim();
const upper = (s) => norm(s).toUpperCase();

// SHS ROUTES
const SHS_ROUTES = {
  "HUMMS A": "HUMMS A",
  "HUMMS B": "HUMMS B",
  "ABM": "ABM",
  "TVL-ICT": "TVL-ICT",
  "TVL-HE": "TVL-HE"
};

function getVal(id) {
  return document.getElementById(id)?.value ?? "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    await ensureAnonAuth();

    const name = norm(getVal("name"));
    const sex = norm(getVal("sex"));
    const age = norm(getVal("age"));
    const section = upper(getVal("section"));
    const lrn = norm(getVal("lrn"));

    if (!SHS_ROUTES[section]) {
      alert("Invalid SHS section");
      return;
    }

    await addDoc(collection(db, "inventory"), {
      track: "SHS",
      name,
      sex,
      age,
      lrn,
      inputGrade: "Grade 11",
      grade: "Grade 12",               // ⭐ FIXED FOR STATS
      section,
      createdAt: serverTimestamp()     // ⭐ REQUIRED
    });

    alert("✅ SHS Enrollment saved");
    form.reset();
  } catch (err) {
    console.error(err);
    alert("❌ FIREBASE ERROR. Check console.");
  }
});