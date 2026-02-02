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
      lrn,
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
  const t = String(rawText || "").toUpperCase().replace(/\r/g, "");
  const lines = t.split("\n").map(x => x.trim()).filter(Boolean);
  const joined = lines.join(" ");

  let name = extractLineValue(lines, "NAME");
  let sex = extractLineValue(lines, "SEX");
  let age = extractLineValue(lines, "AGE");
  let section = "";

  if (!name) {
    const m = joined.match(/NAME[:\s]+(.+?)(?=\b(SEX|AGE|GRADE|SECTION|LRN)\b|$)/i);
    if (m) name = cutAtKeywords(m[1]);
  }

  if (!sex) {
    const m = joined.match(/\b(MALE|FEMALE)\b/i);
    if (m) sex = m[1];
  }

  if (!age) {
    const m = joined.match(/AGE[:\s]+(\d{1,2})/i);
    if (m) age = m[1];
  } else {
    const m = age.match(/\d{1,2}/);
    if (m) age = m[0];
  }

  const sec1 = joined.match(/\b(HUMMS\s*A|HUMMS\s*B|ABM|TVL-ICT|TVL-HE|ICT|HE)\b/i);
  if (sec1) {
    const s = sec1[1].replace(/\s+/g, " ").toUpperCase();
    if (s === "ICT") section = "TVL-ICT";
    else if (s === "HE") section = "TVL-HE";
    else section = s;
  }

  let lrn = extractLineValue(lines, "LRN");
  if (!lrn) {
    const m = joined.match(/LRN[:\s]+(\d{10,12})/i);
    if (m) lrn = m[1];
    if (!lrn) lrn = bestLRN(joined);
  }

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

      setVal("name", parsed.name);
      setVal("sex", parsed.sex);
      setVal("age", parsed.age);
      setVal("section", parsed.section);
      setVal("lrn", parsed.lrn);

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
    window.location.href = "main.html";
  });
}
