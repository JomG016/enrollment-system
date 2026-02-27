// ✅ ADDED: Firestore v12 (match sa dashboard)
import {
  addDoc as addDoc_v12,
  collection as collection_v12,
  serverTimestamp as serverTimestamp_v12
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { db, auth, authReady } from "./firebase-init.js";

// ✅ ADDED: missing import for ensureAnonAuth()
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js"; // ✅ ADDED


// ================================
// SMOOTH CUSTOM POPUP FOR WARNINGS/ERRORS
// ================================
function showSmoothPopup(message, type = "warning") {
  let popup = document.getElementById("smoothPopup");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "smoothPopup";
    popup.style.position = "fixed";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%) scale(0.95)";
    popup.style.minWidth = "280px";
    popup.style.maxWidth = "90vw";
    popup.style.background = type === "error" ? "#ffdddd" : "#fffbe6";
    popup.style.color = type === "error" ? "#b00020" : "#856404";
    popup.style.border = type === "error" ? "2px solid #b00020" : "2px solid #ffe58f";
    popup.style.borderRadius = "16px";
    popup.style.boxShadow = "0 8px 32px rgba(0,0,0,0.18)";
    popup.style.padding = "24px 32px";
    popup.style.fontSize = "1.1rem";
    popup.style.fontWeight = "bold";
    popup.style.textAlign = "center";
    popup.style.zIndex = "999999";
    popup.style.opacity = "0";
    popup.style.transition = "opacity 0.3s, transform 0.3s";
    document.body.appendChild(popup);
  }
  popup.innerText = message;
  popup.style.display = "block";
  popup.style.opacity = "0";
  popup.style.transform = "translate(-50%, -50%) scale(0.95)";
  setTimeout(() => {
    popup.style.opacity = "1";
    popup.style.transform = "translate(-50%, -50%) scale(1)";
  }, 10);
  setTimeout(() => {
    popup.style.opacity = "0";
    popup.style.transform = "translate(-50%, -50%) scale(0.95)";
    setTimeout(() => { popup.style.display = "none"; }, 350);
  }, 2200);
}

// Override window.alert to use smooth popup (except for test_write.js FIREBASE WRITE FAILED)
(() => {
  window._alert = window.alert;
  window.alert = (msg) => {
    if (typeof msg === "string" && msg.includes("FIREBASE WRITE FAILED")) return;
    showSmoothPopup(msg, (typeof msg === "string" && msg.includes("ERROR")) ? "error" : "warning");
  };
})();

// Elements
const form = document.getElementById("enrollmentForm");
const youAreInput = document.getElementById("youAreInput");

// --- helpers ---

// Normalize and uppercase helpers
const norm = (s) => (s || "").toString().trim();
const upper = (s) => norm(s).toUpperCase();

// Contact number normalization (PH)
// Accepts: 09xxxxxxxxx, 639xxxxxxxxx, +639xxxxxxxxx
function normalizeContactNumber(raw){
  let v = norm(raw);
  if(!v) return null;
  // keep digits only
  let d = v.replace(/[^0-9]/g, "");
  if(!d) return null;

  // Convert 63XXXXXXXXXX -> 0XXXXXXXXXX
  if(d.startsWith("63") && d.length === 12){
    d = "0" + d.slice(2);
  }

  // Basic validation: 11 digits starting with 09
  if(d.length !== 11 || !d.startsWith("09")) return null;
  return d;
}

// Enforce name format: SURNAME, NAME MIDDLE NAME (no initials)
function formatFullName(raw) {
  let s = String(raw || "").replace(/\s+/g, " ").trim();
  // Remove extra commas, keep only one
  s = s.replace(/,+/g, ",");
  // Split by comma
  let parts = s.split(",");
  if (parts.length < 2) return ""; // Must have comma
  let surname = parts[0].trim();
  let rest = parts.slice(1).join(",").trim();
  // Remove initials (single letters with/without dot)
  rest = rest.replace(/\b([A-Z])\.?\b/g, "").replace(/\s+/g, " ").trim();
  // Require at least 2 words in rest (name + middle name)
  if (rest.split(" ").length < 2) return "";
  // All caps
  return `${upper(surname)}, ${upper(rest)}`;
}

// Strict LRN: must be exactly 12 digits
function isValidLRN(s) {
  if (!s) return false;
  const digits = String(s).replace(/[^0-9]/g, "");
  return digits.length === 12;
}

// Auto-uppercase for section, name, sex
function autoUppercaseInput(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener("input", () => {

    const start = el.selectionStart;   // remember cursor
    const end = el.selectionEnd;

    // UPPERCASE ONLY — DO NOT TRIM
    el.value = (el.value || "").toUpperCase();

    // restore cursor position (VERY IMPORTANT for mobile)
    el.setSelectionRange(start, end);
  });
}
autoUppercaseInput("sex");
autoUppercaseInput("name");


// ==============================
// GRADE -> SECTION choices (CURRENT grade)
// (Fix: moved out of unhandledrejection so it runs normally)
// ==============================
const gradeEl = document.getElementById("grade");
const sectionEl = document.getElementById("section");

const SECTIONS_BY_GRADE = {
  7: ["PYTHON","SAMPAGUITA","ORCHIDS","LAVENDER","JASMIN","DAISY"],
  8: ["AZURE","VENUS","JUPITER","NEPTUNE","EARTH"],
  9: ["AI","SILVER","COPPER","GOLD","NICKEL"],
  11:["HUMSS A","HUMSS B","ABM","TVL-HE","TVL-ICT","AFA"]
};

function readGradeNumber(){
  const raw = (gradeEl?.value || "").toString();
  const m = raw.match(/\d+/);
  return m ? Number(m[0]) : 0;
}

function fillSectionsForGrade(g){
  if (!sectionEl) return;

  // preserve current selection (if still valid)
  const prev = sectionEl.value;

  sectionEl.innerHTML = '<option value="">Select Section</option>';

  const list = SECTIONS_BY_GRADE[g] || [];
  for (const s of list) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    sectionEl.appendChild(opt);
  }

  // IMPORTANT: wag i-disable para laging clickable (Option A)
  sectionEl.disabled = false;

  // restore selection if still exists, else clear
  if (prev && list.includes(prev)) sectionEl.value = prev;
  else sectionEl.value = "";
}

function refreshSections(){
  fillSectionsForGrade(readGradeNumber());
}

gradeEl?.addEventListener("input", refreshSections);
gradeEl?.addEventListener("change", refreshSections);

// refresh when user opens dropdown
sectionEl?.addEventListener("focus", refreshSections);
sectionEl?.addEventListener("click", refreshSections);

// initial run (this enables the dropdown after you type Grade)
refreshSections();


function parseIncomingGrade(text) {
  const m = norm(text).match(/Grade\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

// ==============================
// ✅ ADDED: ANON AUTH FALLBACK (JHS PAGE)
// - Firestore rules require request.auth != null for create.
// ==============================
async function ensureAnonAuth() {
  try {
    if (!auth?.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (e) {
    console.error("Anon auth fallback failed:", e);
    throw e;
  }
}

// ==============================
// ✅ ADD-ONLY: BETTER INCOMING GRADE DETECTION + FALLBACK
// ==============================
function parseIncomingGradeSmart(text) {
  if (!text) return null;
  const t = String(text).toUpperCase();

  let m =
    t.match(/INCOMING\s*GRADE\s*(\d{1,2})/) ||
    t.match(/GRADE\s*(\d{1,2})/) ||
    t.match(/\bG\s*(\d{1,2})\b/) ||
    t.match(/\b(\d{1,2})\b/);

  return m ? Number(m[1]) : null;
}

function inferIncomingGradeFromSection(section) {
  const s = upper(section);

  // Grade 7 sections -> Incoming Grade 8
  if (["PYTHON","SAMPAGUITA","JASMIN","ORCHIDS","DAISY","LAVENDER"].includes(s)) return 8;

  // Grade 8 sections -> Incoming Grade 9
  if (["AZURE","VENUS","EARTH","JUPITER","NEPTUNE"].includes(s)) return 9;

  // Grade 9 sections -> Incoming Grade 10
  if (["AI","SILVER","COPPER","GOLD","NICKEL"].includes(s)) return 10;

  return null;
}

// ==============================
// ✅ ADDED: BEST UX AUTOFILL ("YOU ARE") WHEN SECTION IS CHOSEN/TYPED
// ==============================
(() => {
  const sectionEl = document.getElementById("section");
  if (!sectionEl || !youAreInput) return;

  function maybeAutofillYouAreFromSection() {
    const inferred = inferIncomingGradeFromSection(sectionEl.value);
    if (!inferred) return;

    const current = parseIncomingGradeSmart(youAreInput.value);
    if (!current) {
      youAreInput.value = `Incoming Grade ${inferred}`;
    }
  }

  sectionEl.addEventListener("change", maybeAutofillYouAreFromSection);
  sectionEl.addEventListener("blur", maybeAutofillYouAreFromSection);
})();

function pickRandom(arr) {
  return arr[Math.random() * arr.length | 0];
}


// ROUTING RULES (JHS + SHS)
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
    "VENUS": [{ grade: "Grade 9", section: "NICKEL" }],
  },
  "Grade 9": {
    "AI": [{ grade: "Grade 10", section: "AI" }],
    "SILVER": [{ grade: "Grade 10", section: "MABINI" }],
    "COPPER": [{ grade: "Grade 10", section: "RIZAL" }],
    "GOLD": [{ grade: "Grade 10", section: "DEL-PILAR" }],
    "NICKEL": [{ grade: "Grade 10", section: "BONIFACIO" }],
  },
  "Grade 11": {
    "HUMSS A": [{ grade: "Grade 12", section: "HUMSS A" }],
    "HUMSS B": [{ grade: "Grade 12", section: "HUMSS B" }],
    "ABM": [{ grade: "Grade 12", section: "ABM" }],
    "TVL-ICT": [{ grade: "Grade 12", section: "TVL-ICT" }],
    "TVL-HE": [{ grade: "Grade 12", section: "TVL-HE" }],
    "AFA": [{ grade: "Grade 12", section: "AFA" }],
  },
};

function routeStudent(inputGrade, inputSection) {
  const sec = upper(inputSection);
  const options = ROUTES?.[inputGrade]?.[sec];
  if (!options || options.length === 0) return null;
  return options.length === 1 ? options[0] : pickRandom(options);
}

// Unified submit handler for both JHS and SHS
let doubleCheckPassed = false;
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
  e.stopPropagation();

  try {
    if (typeof authReady !== "undefined") await authReady;
    await ensureAnonAuth();


    // Get all required fields
    let lrn = norm(document.getElementById("lrn").value);
    let nameRaw = document.getElementById("name").value;
    let section = upper(document.getElementById("section").value);
    let sex = upper(document.getElementById("sex").value);
    let age = norm(document.getElementById("age").value);
    const youAreVal = youAreInput?.value || "";

    // If all fields are empty, show FILL THE FORMS
    if (!lrn && !nameRaw && !section && !sex && !age && !youAreVal) {
      showSmoothPopup("FILL THE FORMS", "warning");
      doubleCheckPassed = false;
      return;
    }

    // Validate LRN
    lrn = lrn.replace(/[^0-9]/g, "");
    if (!isValidLRN(lrn)) {
      alert("LRN must be exactly 12 digits and is required.");
      doubleCheckPassed = false;
      return;
    }

    // Validate name
    let name = formatFullName(nameRaw);
    if (!name) {
      alert("Name must be in the format: SURNAME, NAME MIDDLE NAME (no initials, full names only)");
      doubleCheckPassed = false;
      return;
    }

    // Detect if SHS (Grade 12) or JHS
    let incomingGrade = parseIncomingGradeSmart(youAreVal) || inferIncomingGradeFromSection(section);
    let inputGrade = incomingGrade ? `Grade ${incomingGrade - 1}` : "";
    let track = "JHS";
    let route = null;

    // If SHS (Grade 12) or Grade 11
    if (!incomingGrade && section && ["HUMSS A","HUMSS B","ABM","TVL-ICT","TVL-HE","AFA"].includes(section)) {
      inputGrade = "Grade 11";
      incomingGrade = 12;
      track = "SHS";
      route = routeStudent(inputGrade, section);
    } else if (incomingGrade && incomingGrade >= 11) {
      // If autofilled as incoming 12, treat as SHS
      inputGrade = "Grade 11";
      track = "SHS";
      route = routeStudent(inputGrade, section);
    } else {
      // Default JHS
      route = routeStudent(inputGrade, section);
    }

    if (!route) {
      alert(`No routing for ${inputGrade} - ${section}`);
      doubleCheckPassed = false;
      return;
    }

    if (!doubleCheckPassed) {
      // Show double check popup with 5s countdown, then OK button
      await new Promise((resolve) => {
        let count = 5;
        let popup = document.getElementById("smoothPopup");
        if (!popup) {
          popup = document.createElement("div");
          popup.id = "smoothPopup";
          popup.style.position = "fixed";
          popup.style.top = "50%";
          popup.style.left = "50%";
          popup.style.transform = "translate(-50%, -50%) scale(0.95)";
          popup.style.minWidth = "280px";
          popup.style.maxWidth = "90vw";
          popup.style.background = "#fffbe6";
          popup.style.color = "#856404";
          popup.style.border = "2px solid #ffe58f";
          popup.style.borderRadius = "16px";
          popup.style.boxShadow = "0 8px 32px rgba(0,0,0,0.18)";
          popup.style.padding = "24px 32px";
          popup.style.fontSize = "1.1rem";
          popup.style.fontWeight = "bold";
          popup.style.textAlign = "center";
          popup.style.zIndex = "999999";
          popup.style.opacity = "0";
          popup.style.transition = "opacity 0.3s, transform 0.3s";
          document.body.appendChild(popup);
        }
        function showCountdown() {
          popup.innerHTML = `DOUBLE CHECK YOUR INFORMATION, THANK YOU!<br><br><b>${count}</b>...`;
          popup.style.display = "block";
          popup.style.opacity = "1";
          popup.style.transform = "translate(-50%, -50%) scale(1)";
          if (count > 1) {
            setTimeout(() => { count--; showCountdown(); }, 1000);
          } else {
            setTimeout(() => {
              popup.innerHTML = `DOUBLE CHECK YOUR INFORMATION, THANK YOU!<br><br><button id='popupOkBtn' style='margin-top:16px;padding:8px 32px;font-size:1rem;border-radius:8px;border:none;background:#ffe58f;color:#856404;font-weight:bold;cursor:pointer;'>OK</button>`;
              const okBtn = document.getElementById('popupOkBtn');
              if (okBtn) okBtn.onclick = () => {
                popup.style.opacity = "0";
                setTimeout(() => { popup.style.display = "none"; }, 350);
                resolve();
              };
            }, 1000);
          }
        }
        showCountdown();
      });
      doubleCheckPassed = true;
      return;
    }
    doubleCheckPassed = false;

    await addDoc_v12(collection_v12(db, "inventory"), {
      track,
      name,
      sex,
      age,
      contactNumber: normalizeContactNumber(document.getElementById("contactNumber")?.value),
      lrn,
      LRN: lrn,
      inputGrade,
      grade: route.grade,
      section: route.section,
      createdAt: serverTimestamp_v12()
    });

    // Show success popup for 3s
    let popup = document.getElementById("smoothPopup");
    if (!popup) {
      popup = document.createElement("div");
      popup.id = "smoothPopup";
      popup.style.position = "fixed";
      popup.style.top = "50%";
      popup.style.left = "50%";
      popup.style.transform = "translate(-50%, -50%) scale(0.95)";
      popup.style.minWidth = "280px";
      popup.style.maxWidth = "90vw";
      popup.style.background = "#eaffea";
      popup.style.color = "#1a7f37";
      popup.style.border = "2px solid #b7eb8f";
      popup.style.borderRadius = "16px";
      popup.style.boxShadow = "0 8px 32px rgba(0,0,0,0.18)";
      popup.style.padding = "24px 32px";
      popup.style.fontSize = "1.1rem";
      popup.style.fontWeight = "bold";
      popup.style.textAlign = "center";
      popup.style.zIndex = "999999";
      popup.style.opacity = "0";
      popup.style.transition = "opacity 0.3s, transform 0.3s";
      document.body.appendChild(popup);
    }
    popup.innerHTML = `✅ ENROLMENT SUCCEEDED!`;
    popup.style.background = "#eaffea";
    popup.style.color = "#1a7f37";
    popup.style.border = "2px solid #b7eb8f";
    popup.style.display = "block";
    popup.style.opacity = "1";
    popup.style.transform = "translate(-50%, -50%) scale(1)";
    setTimeout(() => {
      popup.style.opacity = "0";
      setTimeout(() => { popup.style.display = "none"; }, 350);
    }, 3000);
    form.reset();
  } catch (err) {
    console.error("Enrollment submit failed:", err);
    alert("❌ FIREBASE ERROR. Check console.");
    doubleCheckPassed = false;
  }
}, true);

// ✅ ADDED: CAPTURE SUBMIT HANDLER (v12 Firestore) — ito ang magse-save sa inventory
// ✅ ADDED: pinipigilan nito yung old submit handler sa baba para di na mag-error yung collection()
form.addEventListener("submit", async (e) => { // ✅ ADDED
  e.preventDefault(); // ✅ ADDED
  e.stopImmediatePropagation(); // ✅ ADDED
  e.stopPropagation(); // ✅ ADDED

  try { // ✅ ADDED
    if (typeof authReady !== "undefined") await authReady; // ✅ ADDED
    await ensureAnonAuth(); // ✅ ADDED

    const name = norm(document.getElementById("name").value); // ✅ ADDED
    const sex = norm(document.getElementById("sex").value); // ✅ ADDED
    const age = norm(document.getElementById("age").value); // ✅ ADDED
    const section = norm(document.getElementById("section").value); // ✅ ADDED
    const lrn = norm(document.getElementById("lrn").value); // ✅ ADDED

    let incomingGrade = // ✅ ADDED
      parseIncomingGradeSmart(youAreInput?.value) || // ✅ ADDED
      inferIncomingGradeFromSection(section); // ✅ ADDED

    if (!incomingGrade) { // ✅ ADDED
      alert("Incoming Grade not detected. Please select it (YOU ARE)."); // ✅ ADDED
      return; // ✅ ADDED
    } // ✅ ADDED

    if (youAreInput) youAreInput.value = `Incoming Grade ${incomingGrade}`; // ✅ ADDED

    const inputGrade = `Grade ${incomingGrade - 1}`; // ✅ ADDED
    const route = routeStudent(inputGrade, section); // ✅ ADDED
    if (!route) { // ✅ ADDED
      alert(`No routing for ${inputGrade} - ${section}`); // ✅ ADDED
      return; // ✅ ADDED
    } // ✅ ADDED

    await addDoc_v12(collection_v12(db, "inventory"), { // ✅ ADDED
      track: "JHS", // ✅ ADDED
      name, // ✅ ADDED
      sex, // ✅ ADDED
      age, // ✅ ADDED
      contactNumber: normalizeContactNumber(document.getElementById("contactNumber")?.value),
      // Write both `lrn` and `LRN` to ensure dashboard and any existing readers see it
      lrn: lrn || null,
      LRN: lrn || null,
      inputGrade, // ✅ ADDED
      grade: route.grade, // ✅ ADDED
      section: route.section, // ✅ ADDED
      createdAt: serverTimestamp_v12() // ✅ ADDED (serverTimestamp MUST stay)
    }); // ✅ ADDED

    alert("✅ Enrollment saved (JHS)"); // ✅ ADDED
    form.reset(); // ✅ ADDED
  } catch (err) { // ✅ ADDED
    console.error("JHS submit failed:", err); // ✅ ADDED
    alert("❌ FIREBASE ERROR. Check console."); // ✅ ADDED
  } // ✅ ADDED
}, true); // ✅ ADDED (capture=true)

// --- OLD SUBMIT HANDLER (KEEP AS-IS) ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    await authReady;
    await ensureAnonAuth();

    const name = norm(document.getElementById("name").value);
    const sex = norm(document.getElementById("sex").value);
    const age = norm(document.getElementById("age").value);
    const section = norm(document.getElementById("section").value);
    const lrn = norm(document.getElementById("lrn").value);

    let incomingGrade =
      parseIncomingGradeSmart(youAreInput?.value) ||
      inferIncomingGradeFromSection(section);

    if (!incomingGrade) {
      alert("Incoming Grade not detected. Please select it (YOU ARE).");
      return;
    }

    if (youAreInput) youAreInput.value = `Incoming Grade ${incomingGrade}`;

    const inputGrade = `Grade ${incomingGrade - 1}`;
    const route = routeStudent(inputGrade, section);
    if (!route) {
      alert(`No routing for ${inputGrade} - ${section}`);
      return;
    }

    // NOTE: This old block will be stopped by the capture handler above.
    await addDoc(collection(db, "inventory"), {
      track: "JHS",
      name,
      sex,
      age,
      // Keep compatibility with both key styles
      lrn: lrn || null,
      LRN: lrn || null,
      inputGrade,
      grade: route.grade,
      section: route.section,
      createdAt: serverTimestamp()
    });

    alert("✅ Enrollment saved (JHS)");
    form.reset();
  } catch (err) {
    console.error(err);
    alert("❌ FIREBASE ERROR. Check console.");
  }
});




// ================================
// ✅ DROPDOWN TOGGLE (ALWAYS CLICKABLE)
// ================================
(() => {
  const toggleBtn = document.getElementById("dropdownToggle");
  const menu = document.getElementById("dropdownMenu");
  const youAre = document.getElementById("youAreInput");

  if (!toggleBtn || !menu || !youAre) return;

  menu.style.display = "none";
  menu.style.position = "absolute";
  menu.style.zIndex = "99999";
  menu.style.pointerEvents = "auto";

  function openMenu() {
    menu.style.display = "block";
    toggleBtn.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    menu.style.display = "none";
    toggleBtn.setAttribute("aria-expanded", "false");
  }

  function isOpen() {
    return menu.style.display === "block";
  }

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isOpen()) closeMenu();
    else openMenu();
  });

  menu.querySelectorAll(".dropdown-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      youAre.value = btn.textContent.trim();
      closeMenu();
    });
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !toggleBtn.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
})();

const backBtn = document.getElementById("backBtn");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}


// ======================
// ADDED v3: DAILY STATS INCREMENT (NO STATIC IMPORTS)
// Fix: avoids non-top-level import errors.
// ======================
function __cnhs_dateIdToday_v3(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

async function __cnhs_bumpDailyStat_v3(gradeLabel){
  try{
    const mod = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
    const doc_v12 = mod.doc;
    const setDoc_v12 = mod.setDoc;
    const increment_v12 = mod.increment;
    const serverTimestamp_v12 = mod.serverTimestamp;

    const ref = doc_v12(db, "stats_daily", __cnhs_dateIdToday_v3());
    await setDoc_v12(ref, {
      [gradeLabel]: increment_v12(1),
      updatedAt: serverTimestamp_v12()
    }, { merge: true });
  }catch(e){
    console.warn("v3 stats_daily increment failed:", e);
  }
}



// ======================
// ADDED v3: AUTO-BUMP stats_daily when THIS PAGE creates an inventory doc
// (works even if submit handler wasn't edited; no deletes, add-only)
// ======================
(async () => {
  try{
    const mod = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
    const onSnapshot = mod.onSnapshot;
    const collection = mod.collection;
    const query = mod.query;
    const orderBy = mod.orderBy;
    const limit = mod.limit;

    const key = "__cnhs_seen_inventory_ids_v3";
    const seen = new Set(JSON.parse(sessionStorage.getItem(key) || "[]"));

    // Listen to latest inventory docs (small window)
    const qy = query(collection(db, "inventory"), orderBy("createdAt","desc"), limit(10));
    onSnapshot(qy, async (snap) => {
      for(const ch of snap.docChanges()){
        if(ch.type !== "added") continue;
        const id = ch.doc.id;
        if(seen.has(id)) continue;

        const data = ch.doc.data() || {};
        const grade = String(data.grade || "").trim();
        if(grade){
          await __cnhs_bumpDailyStat_v3(grade);
        }

        seen.add(id);
      }
      sessionStorage.setItem(key, JSON.stringify([...seen].slice(-50)));
    });
  }catch(e){
    console.warn("v3 inventory watcher failed:", e);
  }
  // ✅ ADDED: show real firebase error on mobile
function __cnhsExplainFirebaseError(err) {
  const code = err?.code || "";
  const msg = String(err?.message || err || "");
  if (code.includes("permission-denied")) {
    return "❌ PERMISSION DENIED.\nFirestore rules ang problem.\nKailangan signed-in (anon) o ayusin rules.";
  }
  if (code.includes("auth/unauthorized-domain")) {
    return "❌ UNAUTHORIZED DOMAIN.\nCheck exact hostname (walang port).";
  }
  return "❌ FIREBASE ERROR:\n" + (code ? code + "\n" : "") + msg;
}

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e?.reason);
  alert(__cnhsExplainFirebaseError(e?.reason));
});

})();