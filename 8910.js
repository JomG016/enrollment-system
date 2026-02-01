import { db, auth } from "./firebase-init.js";
import { addDoc, collection, serverTimestamp } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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


// Elements
const form = document.getElementById("enrollmentForm");
const youAreInput = document.getElementById("youAreInput");

// --- helpers ---
const norm = (s) => (s || "").toString().trim();
const upper = (s) => norm(s).toUpperCase();

function parseIncomingGrade(text) {
  const m = norm(text).match(/Grade\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ROUTING RULES (UNCHANGED)
const ROUTES = {
  "Grade 7": {
    "PYTHON": [{ grade: "Grade 8", section: "PYTHON" }],
    "SAMPAGUITA": [{ grade: "Grade 8", section: "EARTH" }],
    "JASMIN": [{ grade: "Grade 8", section: "JUPITER" }],
    "ORCHIDS": [{ grade: "Grade 8", section: "NEPTUNE" }],
    "DAISY": [{ grade: "Grade 8", section: "VENUS" }],
    "LAVENDER": [
      { grade: "Grade 8", section: "VENUS" },
      { grade: "Grade 8", section: "NEPTUNE" },
      { grade: "Grade 8", section: "JUPITER" }
    ],
  },
  "Grade 8": {
    "AZURE": [{ grade: "Grade 9", section: "AZURE" }],
    "EARTH": [{ grade: "Grade 9", section: "SILVER" }],
    "JUPITER": [{ grade: "Grade 9", section: "COPPER" }],
    "NEPTUNE": [{ grade: "Grade 9", section: "GOLD" }],
    "DAISY": [{ grade: "Grade 9", section: "NICKEL" }],
  },
  "Grade 9": {
    "AI": [{ grade: "Grade 10", section: "AI" }],
    "SILVER": [{ grade: "Grade 10", section: "MABINI" }],
    "COPPER": [{ grade: "Grade 10", section: "RIZAL" }],
    "GOLD": [{ grade: "Grade 10", section: "DEL-PILAR" }],
    "NICKEL": [{ grade: "Grade 10", section: "BONIFACIO" }],
  },
};

function routeStudent(inputGrade, inputSection) {
  const sec = upper(inputSection);
  const options = ROUTES?.[inputGrade]?.[sec];
  if (!options || options.length === 0) return null;
  return options.length === 1 ? options[0] : pickRandom(options);
}

// --- SUBMIT ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    await ensureAnonAuth();

    const name = norm(document.getElementById("name").value);
    const sex = norm(document.getElementById("sex").value);
    const age = norm(document.getElementById("age").value);
    const section = norm(document.getElementById("section").value);
    const lrn = norm(document.getElementById("lrn").value);

    const incomingGrade = parseIncomingGrade(youAreInput.value);
    if (!incomingGrade) {
      alert("Please select Incoming Grade.");
      return;
    }

    const inputGrade = `Grade ${incomingGrade - 1}`;
    const route = routeStudent(inputGrade, section);
    if (!route) {
      alert(`No routing for ${inputGrade} - ${section}`);
      return;
    }

    await addDoc(collection(db, "inventory"), {
      track: "JHS",
      name,
      sex,
      age,
      lrn,
      inputGrade,
      grade: route.grade,              // ⭐ IMPORTANT FOR STATS
      section: route.section,
      createdAt: serverTimestamp()     // ⭐ REQUIRED FOR DAILY GRAPH
    });

    alert("✅ Enrollment saved (JHS)");
    form.reset();
  } catch (err) {
    console.error(err);
    alert("❌ FIREBASE ERROR. Check console.");
  }
});