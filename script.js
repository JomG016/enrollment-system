import { db, auth, authReady } from "./firebase-init.js";
import {
  addDoc as addDoc_v12,
  collection as collection_v12,
  serverTimestamp as serverTimestamp_v12
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ✅ ADDED: anon auth fallback
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js"; // ✅ ADDED

async function ensureAnonAuth() { // ✅ ADDED
  try { // ✅ ADDED
    if (!auth?.currentUser) await signInAnonymously(auth); // ✅ ADDED
  } catch (e) { // ✅ ADDED
    console.error("Anon auth failed:", e); // ✅ ADDED
    throw e; // ✅ ADDED
  } // ✅ ADDED
} // ✅ ADDED

const form = document.getElementById("enrollmentForm") || document.querySelector("form");

const norm = (s) => (s || "").toString().trim();
const upper = (s) => norm(s).toUpperCase();

// ===============================
// ✅ SHS ROUTING (Grade 11 → Grade 12)
// ===============================
const SHS_ROUTES = {
  "Grade 11": {
    "HUMMS A": [{ grade: "Grade 12", section: "HUMMS A" }],
    "HUMMS B": [{ grade: "Grade 12", section: "HUMMS B" }],
    "ABM": [{ grade: "Grade 12", section: "ABM" }],
    "TVL-ICT": [{ grade: "Grade 12", section: "TVL-ICT" }],
    "TVL-HE": [{ grade: "Grade 12", section: "TVL-HE" }],
    "AFA": [{ grade: "Grade 12", section: "AFA" }],
  },
};

function getVal(id) {
  return document.getElementById(id)?.value ?? "";
}

function pickRandom(arr) {
  return arr[Math.random() * arr.length | 0];
}

function routeSHS(inputGrade, inputSection) {
  const sec = upper(inputSection);
  const options = SHS_ROUTES?.[inputGrade]?.[sec];
  if (!options || options.length === 0) return null;
  return options.length === 1 ? options[0] : pickRandom(options);
}

// ✅ FIXED: correct handler name (was Submit / handleSubmit mismatch)
async function handleSubmit(e) {
  if (e?.preventDefault) e.preventDefault();

  try {
    await authReady;
    await ensureAnonAuth();

    const name = norm(getVal("name"));
    const sex = norm(getVal("sex"));
    const age = norm(getVal("age"));
    const section = upper(getVal("section"));
    const lrn = norm(getVal("lrn"));

    const inputGrade = "Grade 11";
    const route = routeSHS(inputGrade, section);
    if (!route) {
      alert("Invalid SHS section");
      return;
    }

    await addDoc_v12(collection_v12(db, "inventory"), {
      track: "SHS",
      name,
      sex,
      age,
      // Store both lowercase and uppercase keys for compatibility with dashboard
      lrn: lrn || null,
      LRN: lrn || null,
      inputGrade,
      grade: route.grade,
      section: route.section,
      createdAt: serverTimestamp_v12() // ✅ serverTimestamp MUST stay
    });

    alert("✅ SHS Enrollment saved");

    if (form && form.reset) form.reset();
    else {
      ["name", "sex", "age", "grade", "section", "lrn", "youAreInput"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
    }

  } catch (err) {
    console.error(err);
    alert("❌ FIREBASE ERROR. Check console.");
  }
}

// Attach submit handler if a form exists
if (form) {
  form.addEventListener("submit", handleSubmit);
}

// SHS.html has submitBtn type=button, so bind click
const submitBtn = document.getElementById("submitBtn");
if (submitBtn) {
  submitBtn.addEventListener("click", handleSubmit);
}


// =====================================================
// ✅ UPLOAD PREVIEW + OCR AUTOFILL (UNCHANGED)
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

// Validation helpers to avoid filling garbage
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
  return /[A-Za-z]/.test(t) && t.split(/\s+/).length >= 2 && t.length >= 4;
}
function isValidSection(s){
  if(!s) return false;
  const t = String(s).trim();
  return /^[A-Z0-9\-\s]{2,20}$/i.test(t);
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
  // Tolerant OCR parsing with label-first strategy and strong fallbacks
  const raw = String(rawText || "").replace(/\r/g, "\n");
  const cleaned = raw.replace(/[\u2018\u2019\u201C\u201D\u2013\u2014]/g, ' ').replace(/[^	\n\x20-\x7E]/g, ' ');
  const lines = cleaned.split("\n").map(x => x.trim()).filter(Boolean);
  const joined = lines.join(" ");
  const U = joined.toUpperCase();

  const nameLabels = ['NAME','STUDENT NAME','FULL NAME'];
  const sexLabels = ['SEX','GENDER'];
  const ageLabels = ['AGE'];
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
  let section = "";
  let lrn = labelExtract(lrnLabels);

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

  // Section detection
  const secRe = /\b(HUMMS\s*A|HUMMS\s*B|ABM|TVL-ICT|TVL-HE|ICT|HE|MAHARLIKA)\b/i;
  const sec1 = joined.match(secRe);
  if (sec1) {
    const s = sec1[1].replace(/\s+/g, " ").toUpperCase();
    if (s === "ICT") section = "TVL-ICT";
    else if (s === "HE") section = "TVL-HE";
    else section = s;
  }

  // LRN extraction: labelled or first 10-12 digit sequence
  if (!lrn) {
    const m = joined.match(/LRN[:\s]*([0-9\-\s]{10,16})/i);
    if (m) lrn = (m[1] || '').replace(/[^0-9]/g,'');
    if (!lrn) lrn = bestLRN(joined);
  }

  // Name fallback: choose first plausible line that isn't a label
  if (!name) {
    for(const ln of lines){
      if (/\b(SEX|AGE|GRADE|SECTION|LRN|INCOMING|STUDENT|ID|SCHOOL)\b/i.test(ln)) continue;
      const parts = ln.trim().split(/\s+/);
      if (parts.length >= 2 && parts.length <= 6 && /[A-Za-z]/.test(ln)) { name = cutAtKeywords(ln); break; }
    }
  }

  // Normalize name: strip labels/garbage, prefer comma-separated and title-case
  function normalizeName(n){
    if(!n) return "";
    let s = String(n).trim();
    s = s.replace(/\b(NAME|STUDENT|LRN|AGE|SEX|GRADE|SECTION)[:\s]*\b/ig,'').trim();
    s = s.replace(/[^A-Za-z\,\.\s\-']/g,'');
    if(/\d/.test(s)) s = s.replace(/\d+/g,'');
    s = s.replace(/\s{2,}/g,' ');
    if(/,/.test(s)){
      return s.split(',').map(p => p.trim()).filter(Boolean).join(', ');
    }
    return s.split(/\s+/).map(w => w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
  }

  name = normalizeName(name);

  if (name) name = name.trim();
  if (sex) sex = sex.trim();
  if (age) age = String(age).trim();
  if (section) section = section.trim();
  if (lrn) lrn = String(lrn).trim();

  return { name, sex, age, section, lrn };
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

// OCR on upload click
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

      // Apply stricter validation to avoid garbage autofill
      if (isValidName(parsed.name)) { setVal("name", parsed.name); logLine("NAME autofilled"); }
      else logLine("NAME not confident — skipped");

      if (isValidSex(parsed.sex)) { setVal("sex", parsed.sex); logLine("SEX autofilled"); }
      else logLine("SEX not confident — skipped");

      if (isValidAge(parsed.age)) { setVal("age", parsed.age); logLine("AGE autofilled"); }
      else logLine("AGE not confident — skipped");

      if (isValidSection(parsed.section)) { setVal("section", parsed.section); logLine("SECTION autofilled"); }
      else logLine("SECTION not confident — skipped");

      if (isValidLRN(parsed.lrn)) { setVal("lrn", parsed.lrn); logLine("LRN autofilled"); }
      else logLine("LRN not confident — skipped");

      logLine("✅ AUTOFILL DONE");
    } catch (err) {
      console.error(err);
      logLine("❌ OCR failed. Check console.");
      alert("OCR failed. Try clearer image.");
    }
  });
}


// ================================
// ✅ DROPDOWN TOGGLE (UNCHANGED)
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

// Back button
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

