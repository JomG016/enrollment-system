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
// ✅ SUPPRESS ONLY test_write.js ALERT
// (Fix "FIREBASE WRITE FAILED" popup after success)
// ================================
(() => {
  const _alert = window.alert;
  window.alert = (msg) => {
    if (typeof msg === "string" && msg.includes("FIREBASE WRITE FAILED")) return;
    return _alert(msg);
  };
})();

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
  if (["AZURE","EARTH","JUPITER","NEPTUNE"].includes(s)) return 9;

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


// =====================================================
// ✅ ADDED ONLY: UPLOAD PREVIEW + OCR AUTOFILL (FIXED)
// =====================================================
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const previewImg = document.getElementById("previewImg");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const logBox = document.getElementById("logBox");

function clearLog() {
  if (logBox) logBox.textContent = "";
}

function logLine(msg) {
  if (!logBox) return;
  logBox.textContent += (logBox.textContent ? "\n" : "") + msg;
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  if (val === undefined || val === null) return;
  const v = String(val).trim();
  if (v) el.value = v;
}

// Validation helpers used to avoid filling garbage from OCR
function isValidLRN(s){
  if(!s) return false;
  const digits = String(s).replace(/[^0-9]/g,'');
  return digits.length >= 10 && digits.length <= 12;
}
function isValidAge(s){
  if(!s) return false;
  const n = Number(String(s).match(/\d{1,2}/));
  return Number.isInteger(n) && n >= 4 && n <= 100;
}
function isValidSex(s){
  if(!s) return false;
  return /^(MALE|FEMALE|M|F)$/i.test(String(s).trim());
}
function isValidName(s){
  if(!s) return false;
  const t = String(s).trim();
  // require at least two words and letters
  return /[A-Za-z]/.test(t) && t.split(/\s+/).length >= 2 && t.length >= 4;
}
function isValidGrade(s){
  if(!s) return false;
  const m = String(s).match(/(\d{1,2})/);
  if(m) return Number(m[1]) >= 7 && Number(m[1]) <= 12;
  const w = String(s).toUpperCase();
  return /EIGHT|NINE|TEN|ELEVEN|TWELVE|SEVEN/.test(w);
}
function isValidSection(s){
  if(!s) return false;
  const t = String(s).trim();
  // allow known sections or short all-letter tokens
  if(/^[A-Z0-9\-\s]{2,20}$/i.test(t)) return true;
  return false;
}

function bestLRN(text) {
  const matches = text.match(/\b\d{10,12}\b/g) || [];
  if (matches.length === 0) return "";
  const m12 = matches.find(x => x.length === 12);
  return m12 || matches[0];
}

function cutAtKeywords(s) {
  return (s || "")
    .replace(/\b(SEX|AGE|GRADE|SECTION|LRN)\b.*$/i, "")
    .trim();
}

function extractLineValue(lines, label) {
  const re = new RegExp(`^\\s*${label}\\s*[:\\-]?\\s*(.+)$`, "i");
  for (const ln of lines) {
    const m = ln.match(re);
    if (m) return cutAtKeywords(m[1]);
  }
  return "";
}

function parseOCRToFields(rawText) {
  // More tolerant OCR parsing: label-first, then fallbacks
  const raw = String(rawText || "").replace(/\r/g, "\n");
  const cleaned = raw.replace(/[\u2018\u2019\u201C\u201D\u2013\u2014]/g, ' ').replace(/[^	\n\x20-\x7E]/g, ' ');
  const lines = cleaned.split("\n").map(x => x.trim()).filter(Boolean);
  const joined = lines.join(" ");
  const U = joined.toUpperCase();

  const nameLabels = ['NAME','STUDENT NAME','FULL NAME'];
  const sexLabels = ['SEX','GENDER'];
  const ageLabels = ['AGE','AGE:'];
  const gradeLabels = ['GRADE','GRADE LEVEL','YR'];
  const lrnLabels = ['LRN','LEARNER REFERENCE NUMBER'];

  function labelExtract(labels){
    for(const ln of lines){
      for(const lbl of labels){
        const re = new RegExp('^\\s*'+lbl+'\\s*[:\\-]?\\s*(.+)$','i');
        const m = ln.match(re);
        if(m) return cutAtKeywords(m[1]);
      }
    }
    return "";
  }

  let name = labelExtract(nameLabels);
  let sex = labelExtract(sexLabels);
  let age = labelExtract(ageLabels);
  let grade = labelExtract(gradeLabels);
  let section = "";
  let lrn = labelExtract(lrnLabels);

  // Fallbacks
  if (!sex) {
    const m = U.match(/\b(MALE|FEMALE)\b/);
    if (m) sex = m[1];
  }

  if (!age) {
    const m = U.match(/AGE[:\s]*(\d{1,2})/i);
    if (m) age = m[1];
  } else {
    const m = age.match(/\d{1,2}/);
    if (m) age = m[0];
  }

  // Grade detection: numeric or word (EIGHT -> 8)
  if (!grade) {
    let m = U.match(/INCOMING\s*GRADE\s*(\d{1,2})/i) || U.match(/GRADE\s*(\d{1,2})/i) || U.match(/\bG\s*(\d{1,2})\b/);
    if (m) grade = m[1];
    else {
      const wordMap = { 'EIGHT':8,'NINE':9,'TEN':10,'ELEVEN':11,'TWELVE':12,'SEVEN':7 };
      const wm = U.match(/\b(EIGHT|NINE|TEN|ELEVEN|TWELVE|SEVEN)\b/);
      if (wm) grade = String(wordMap[wm[1]]);
    }
  }

  // Section detection from known values
  const secRe = /\b(PYTHON|SAMPAGUITA|JASMIN|ORCHIDS|DAISY|LAVENDER|AZURE|EARTH|JUPITER|NEPTUNE|AI|SILVER|COPPER|GOLD|NICKEL|HUMMS\s*A|HUMMS\s*B|ABM|TVL-ICT|TVL-HE|ICT|HE|MAHARLIKA)\b/i;
  const sec1 = joined.match(secRe);
  if (sec1) section = sec1[1].replace(/\s+/g,' ').toUpperCase();

  // LRN: labelled or first 10-12 digit sequence
  if (!lrn) {
    const m = joined.match(/LRN[:\s]*([0-9\-\s]{10,16})/i);
    if (m) lrn = (m[1] || '').replace(/[^0-9]/g,'');
    if (!lrn) lrn = bestLRN(joined);
  }

  // Name fallback: find a line that looks like a name (contains letters and a space, not other labels)
  if (!name) {
    for(const ln of lines){
      if (/\b(SEX|AGE|GRADE|SECTION|LRN|INCOMING|STUDENT|ID|SCHOOL)\b/i.test(ln)) continue;
      if (/[^A-Z\s\,\.]/i.test(ln)) {
        // allow typical name chars
      }
      const parts = ln.trim().split(/\s+/);
      if (parts.length >= 2 && parts.length <= 5 && /[A-Za-z]/.test(ln)) { name = cutAtKeywords(ln); break; }
    }
  }

  // Normalize name: remove stray labels, digits; prefer comma-separated 'Last, First' when available
  function normalizeName(n){
    if(!n) return "";
    let s = String(n).trim();
    s = s.replace(/\b(NAME|STUDENT|LRN|AGE|SEX|GRADE|SECTION)[:\s]*\b/ig,'').trim();
    s = s.replace(/[^A-Za-z\,\.\s\-']/g,'');
    // if contains digits after cleanup, reject
    if(/\d/.test(s)) s = s.replace(/\d+/g,'');
    s = s.replace(/\s{2,}/g,' ');
    // prefer comma format; else title case
    if(/,/.test(s)){
      return s.split(',').map(p => p.trim()).filter(Boolean).join(', ');
    }
    // Title case words
    return s.split(/\s+/).map(w => w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
  }

  name = normalizeName(name);

  let incoming = "";
  const inc = U.match(/INCOMING\s*GRADE\s*(\d{1,2})/i) || (grade && grade.match(/\d{1,2}/));
  if (inc) incoming = `Incoming Grade ${inc[1] || grade}`;

  // Normalize outputs
  if (name) name = name.trim();
  if (sex) sex = sex.trim();
  if (age) age = String(age).trim();
  if (grade) grade = String(grade).trim();
  if (section) section = section.trim();
  if (lrn) lrn = String(lrn).trim();

  return { name, sex, age, grade, section, lrn, incoming };
}

// Preview on choose
if (fileInput) {
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (previewImg) {
      previewImg.src = URL.createObjectURL(file);
      previewImg.style.display = "block";
    }
    if (previewPlaceholder) previewPlaceholder.style.display = "none";

    clearLog();
    logLine("🖼️ Image selected. Click UPLOAD to auto-fill.");
  });
}

// OCR on upload click (LINE-BY-LINE %)
if (uploadBtn) {
  uploadBtn.addEventListener("click", async () => {
    const file = fileInput?.files?.[0];
    if (!file) {
      alert("Please choose an image first.");
      return;
    }
    if (typeof Tesseract === "undefined") {
      alert("Tesseract.js not loaded.");
      return;
    }

    clearLog();
    let lastPct = 0;
    logLine("OCR LOADING 0%");

    try {
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m) => {
          if (m?.status === "recognizing text" && typeof m.progress === "number") {
            const pct = Math.max(1, Math.min(100, Math.floor(m.progress * 100)));
            while (lastPct < pct) {
              lastPct++;
              logLine(`OCR LOADING ${lastPct}%`);
            }
          }
        }
      });

      const text = result?.data?.text || "";
      const parsed = parseOCRToFields(text);

      // Only set fields that pass validation to avoid garbage autofill
      if (isValidName(parsed.name)) { setVal("name", parsed.name); logLine("NAME autofilled"); }
      else logLine("NAME not confident — skipped");

      if (isValidSex(parsed.sex)) { setVal("sex", parsed.sex); logLine("SEX autofilled"); }
      else logLine("SEX not confident — skipped");

      if (isValidAge(parsed.age)) { setVal("age", parsed.age); logLine("AGE autofilled"); }
      else logLine("AGE not confident — skipped");

      if (isValidGrade(parsed.grade)) { setVal("grade", parsed.grade); logLine("GRADE autofilled"); }
      else logLine("GRADE not confident — skipped");

      if (isValidSection(parsed.section)) { setVal("section", parsed.section); logLine("SECTION autofilled"); }
      else logLine("SECTION not confident — skipped");

      if (isValidLRN(parsed.lrn)) { setVal("lrn", parsed.lrn); logLine("LRN autofilled"); }
      else logLine("LRN not confident — skipped");

      if (youAreInput && parsed.incoming) youAreInput.value = parsed.incoming;

      logLine("✅ AUTOFILL DONE");
    } catch (err) {
      console.error(err);
      logLine("❌ OCR failed. Check console.");
      alert("OCR failed. Try clearer image.");
    }
  });
}


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
})();

