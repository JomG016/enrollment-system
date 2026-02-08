// ======================
// ADDED v6: Firestore documentId() shim for existing FieldPath.documentId() calls
// (No lines removed; this file includes original inv.js content unchanged after this block)
// ======================
import { auth } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  // WALANG USER or ANONYMOUS → BALIK SA LOGIN
  if (!user || user.isAnonymous) {
    window.location.replace("./admin.html");
    return;
  }

  // OPTIONAL: email allowlist (recommended)
  const allowedAdmins = [
    "carmennhsenrollment@gmail.com",
    "admin@gmail.com"
  ];

  if (!allowedAdmins.includes(user.email)) {
    alert("Not authorized");
    window.location.replace("./admin.html");
  }
});

import { documentId as __cnhs_documentId_v6, FieldPath as __cnhs_FieldPath_v6 } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

try {
  // Ensure FieldPath exists and has documentId() (compat layer)
  if (typeof __cnhs_FieldPath_v6.documentId !== "function") {
    __cnhs_FieldPath_v6.documentId = __cnhs_documentId_v6;
  }
  // Also patch global FieldPath if code references it from global scope
  if (typeof globalThis.FieldPath === "undefined" || globalThis.FieldPath === null) {
    globalThis.FieldPath = __cnhs_FieldPath_v6;
  } else if (typeof globalThis.FieldPath.documentId !== "function") {
    globalThis.FieldPath.documentId = __cnhs_documentId_v6;
  }
} catch (e) {
  console.warn("v6 FieldPath.documentId shim failed:", e);
}

// ======================
// ADDED v6: ensure chart canvas has height (Chart.js needs non-zero height)
// ======================
(function __cnhs_fixCanvasHeight_v6(){
  const c = document.getElementById("dailyChart");
  if(!c) return;
  // If canvas is inside a container with no height, Chart will appear blank
  const parent = c.parentElement;
  if(parent){
    const h = parent.getBoundingClientRect().height;
    if(!h || h < 50){
      parent.style.height = "420px";
      parent.style.minHeight = "420px";
      parent.style.position = parent.style.position || "relative";
    }
  }
  c.style.width = "100%";
  c.style.height = "100%";
})();



// ==============================
// CNHS Dashboard Logic (FREE plan - Option B)
// Data source: Firestore inventory + stats_daily (computed by admin dashboard)
// ==============================

import { db } from "./firebase.js";
import {
  collection, getDocs, query, where, orderBy, limit,
  doc, writeBatch, serverTimestamp, FieldPath,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// required password for reset
const RESET_PASSWORD = "CNHSadmin0nly";

// helpers
const qs = (s) => document.querySelector(s);
const qsa = (s) => [...document.querySelectorAll(s)];

// ---------------------------
// Pages
// ---------------------------
function setActiveSidebar(id){
  qsa(".sidebtn").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById(id);
  if(btn) btn.classList.add("active");
}

function showPage(pageId){
  qsa(".page").forEach(p => p.classList.remove("active"));
  const p = document.getElementById(pageId);
  if(p) p.classList.add("active");
}

// ---------------------------
// Theme
// ---------------------------
function applyTheme(mode){
  document.body.classList.remove("day","night");
  document.body.classList.add(mode);

  const label = document.getElementById("themeLabel");
  if(label) label.textContent = (mode === "night") ? "DAY MODE" : "NIGHT MODE";

  localStorage.setItem("cnhs_theme", mode);
}

function toggleTheme(){
  const isNight = document.body.classList.contains("night");
  applyTheme(isNight ? "day" : "night");
}

// ---------------------------
// Tabs + Adviser mapping (from PPT)
// ---------------------------
const gradeSections = {
  "Grade 8": ["PYTHON","EARTH","JUPITER","VENUS","NEPTUNE"],
  "Grade 9": ["AZURE","SILVER","COPPER","GOLD","NICKEL"],
  "Grade 10": ["AI","MABINI","RIZAL","BONIFACIO","DEL-PILAR"],
  "Grade 12": ["HUMMS A","HUMMS B","ABM","TVL-ICT","TVL-HE", "AFA"]
};

const adviserByGradeSection = {
  "Grade 8|PYTHON": "MARY GRACE NOVIDA ADOR DONICIO",
  "Grade 8|EARTH": "  MILDRED GABRIEL",
  "Grade 8|JUPITER": "HERBERT BAUTISTA",
  "Grade 8|VENUS": "ROSE ANN M. CASTILLO",
  "Grade 8|NEPTUNE": "FELVIRA MANALANG",

  "Grade 9|AZURE": "JEMMELYN SANTIAGO",
  "Grade 9|SILVER": "NESSY GABOY",
  "Grade 9|COPPER": "PHILMAR ABARE",
  "Grade 9|GOLD": "CHRISCHELL DELA CRUZ",
  "Grade 9|NICKEL": "MARK WELLMAN ARMISA",

  "Grade 10|AI": "MERRYLYN PALAPAL",
  "Grade 10|MABINI": "CHERRY SANTOS",
  "Grade 10|RIZAL": "MELIZZA CALUBANA",
  "Grade 10|BONIFACIO": "GIRLIE JOY YAMBAO",
  "Grade 10|DEL-PILAR": "JOCELYN DAGA",

  "Grade 12|HUMMS A": "VALERIE AGTANI",
  "Grade 12|HUMMS B": "REVELYN CENTENO",
  "Grade 12|ABM": "MARIBETH DEGUZMAN",
  "Grade 12|TVL-ICT": "TAGUMPAY IRABAGON",
  "Grade 12|TVL-HE": "CHELMI TURLA",
  "Grade 12|AFA": "KATRINA MARI RUIZ"
};

const adviserImageMap = {
  "MARY GRACE NOVIDA ADOR DONICIO": "grace.jpeg",
  "MILDRED GABRIEL": "mildred.jpeg",
  "HERBERT BAUTISTA": "herbert.jpeg",
  "ROSE ANN M. CASTILLO": "roseann.jpeg",
  "FELVIRA MANALANG": "fel.jpeg",

  "JEMMELYN SANTIAGO": "jem.jpeg",
  "NESSY GABOY": "nessy.jpeg",
  "PHILMAR ABARE": "philmar.jpeg",
  "CHRISCHELL DELA CRUZ": "chrischell.jpeg",
  "MARK WELLMAN ARMISA": "mark.jpeg",

  "MERRYLYN PALAPAL": "merry.jpeg",
  "CHERRY SANTOS": "cherry.jpeg",
  "MELIZZA CALUBANA": "melizza.jpeg",
  "GIRLIE JOY YAMBAO": "girlie.jpeg",
  "JOCELYN DAGA": "jocelyn.jpeg",

  "VALERIE AGTANI": "valerie.jpeg",
  "REVELYN CENTENO": "rev.jpeg",
  "MARIBETH DEGUZMAN": "maribeth.jpeg",
  "TAGUMPAY IRABAGON": "tags.jpeg",
  "CHELMI TURLA": "chelmi.jpeg",
  "KATRINA MARI RUIZ": "mari.jpeg"
};

let activeGrade = "Grade 8";
let activeSection = gradeSections[activeGrade][0];

function updateAdviser(){
  const key = `${activeGrade}|${activeSection}`;
  qs("#adviserName").textContent = adviserByGradeSection[key] || "DI PA ALAM";
    // ======================
  // ADD ONLY: change adviser avatar per teacher
  // ======================
  const img = document.getElementById("adviserAvatar");
  if(img){
    const raw = adviserByGradeSection[key] || "";
    const adviser = String(raw).trim().replace(/\s+/g, " ");
    img.src = adviserImageMap[adviser] || "mamjesusa.png";
    img.onerror = () => {
      img.onerror = null;
      img.src = "mamjesusa.png";
    };
  }

}

function renderSectionTabs(){
  const wrap = qs("#sectionTabs");
  wrap.innerHTML = "";

  const sections = gradeSections[activeGrade] || [];
  if(!sections.length){
    wrap.innerHTML = "<div style='font-weight:900;opacity:.8'>No sections.</div>";
    return;
  }

  if(!activeSection || !sections.includes(activeSection)){
    activeSection = sections[0];
  }

  sections.forEach(sec => {
    const b = document.createElement("button");
    b.className = "tab sectionTab" + (sec === activeSection ? " active" : "");
    b.type = "button";
    b.textContent = sec;

    b.addEventListener("click", async () => {
      activeSection = sec;
      qsa(".sectionTab").forEach(x => x.classList.toggle("active", x.textContent === sec));
      updateAdviser();
      await renderTable();
    });

    wrap.appendChild(b);
  });

  updateAdviser();
  renderTable(); // fire and forget
}

// ---------------------------
// Helpers
// ---------------------------
function safeText(v){
  if(v === undefined || v === null || v === "") return "—";
  return String(v);
}

function formatName(e){
  const first = e.firstName || e.firstname || e.fname || "";
  const last  = e.lastName || e.lastname || e.lname || "";
  const mid   = e.middleName || e.middlename || e.mname || "";
  if(last && first) return `${last}, ${first}${mid ? " " + mid : ""}`;
  return e.name || `${first} ${last}`.trim() || "—";
}

function dateIdFromDate(d){
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateIdFromTimestamp(ts){
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if(!d || isNaN(d.getTime())) return null;
  return dateIdFromDate(d);
}

// ---------------------------
// TABLE: Firestore inventory
// ---------------------------
async function fetchInventoryForActive(){
  // You can increase limit if you want
  const qy = query(
    collection(db, "inventory"),
    where("grade", "==", activeGrade),
    where("section", "==", activeSection),
    orderBy("createdAt", "desc"),
    limit(250)
  );

  const snap = await getDocs(qy);
  const rows = [];
  snap.forEach(ds => rows.push({ id: ds.id, ...ds.data() }));
  return rows;
}

async function renderTable(){
  const tbody = qs("#tableBody");
  const empty = qs("#emptyState");
  tbody.innerHTML = "";

  let rows = [];
 try{
  rows = await fetchInventoryForActive();
}catch(err){
  console.error(err);

  // ✅ ADDED: show exact firestore error on UI
  const msg = String(err?.message || err);
  const box = document.getElementById("emptyState");
  if(box){
    box.hidden = false;
    box.textContent = msg.includes("index")
      ? "FIRESTORE INDEX REQUIRED: gumawa ng composite index (grade, section, createdAt)."
      : msg.includes("permission")
        ? "PERMISSION DENIED: dashboard needs admin UID in /admins/{uid}."
        : ("ERROR: " + msg);
  }

  return;
}

  if(rows.length === 0){
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  rows.forEach(e => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${safeText(formatName(e))}</td>
      <td>${safeText(e.sex || e.gender)}</td>
      <td>${safeText(e.age)}</td>
      <td>${safeText(activeGrade)}</td>
      <td>${safeText(activeSection)}</td>
      <td>${safeText(e.lrn || e.LRN)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------------------------
// GRAPH: Option B (FREE)
// rebuild from inventory -> write stats_daily -> render from stats_daily
// ---------------------------
const GRADES = ["Grade 8","Grade 9","Grade 10","Grade 12"];
let chart = null;

async function rebuildStatsDaily(daysBack = 30){
  const end = new Date();
  end.setHours(23,59,59,999);

  const start = new Date();
  start.setDate(start.getDate() - (daysBack - 1));
  start.setHours(0,0,0,0);

  // Query inventory in date range (admin-only)
  const qy = query(
    collection(db, "inventory"),
    where("createdAt", ">=", start),
    where("createdAt", "<=", end),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(qy);

  // dateId -> counts
  const map = new Map();

  snap.forEach(ds => {
    const data = ds.data();
    const grade = String(data.grade || "").trim();
    const dateId = dateIdFromTimestamp(data.createdAt);
    if(!dateId) return;
    if(!GRADES.includes(grade)) return;

    if(!map.has(dateId)){
      const init = {};
      GRADES.forEach(g => init[g] = 0);
      map.set(dateId, init);
    }
    map.get(dateId)[grade] += 1;
  });

  // Write stats_daily
  const batch = writeBatch(db);

  for(const [dateId, counts] of map.entries()){
    const ref = doc(db, "stats_daily", dateId);
    batch.set(ref, { ...counts, updatedAt: serverTimestamp() }, { merge: true });
  }

  await batch.commit();
}

async function fetchStatsDaily(daysBack = 30){
  const end = new Date();
  end.setHours(23,59,59,999);

  const start = new Date();
  start.setDate(start.getDate() - (daysBack - 1));
  start.setHours(0,0,0,0);

  const startId = dateIdFromDate(start);
  const endId = dateIdFromDate(end);

  const qy = query(
    collection(db, "stats_daily"),
    orderBy(FieldPath.documentId()),
    where(FieldPath.documentId(), ">=", startId),
    where(FieldPath.documentId(), "<=", endId)
  );

  const snap = await getDocs(qy);

  const labels = [];
  const rows = [];
  snap.forEach(ds => {
    labels.push(ds.id);
    rows.push(ds.data());
  });

  return { labels, rows };
}

async function renderGraphFromStatsDaily(daysBack = 30){
  const { labels, rows } = await fetchStatsDaily(daysBack);

  const datasets = GRADES.map(g => ({
    label: g,
    data: rows.map(r => r?.[g] || 0),
    tension: 0.25,
    fill: false
  }));

  const ctx = qs("#dailyChart");
  if(!ctx) return;

  if(chart){ chart.destroy(); chart = null; }

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels.length ? labels : ["No data"],
      datasets: labels.length ? datasets : [{ label: "No data", data: [0] }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { weight: "bold" } } },
        tooltip: { mode: "index", intersect: false }
      },
      interaction: { mode: "nearest", axis: "x", intersect: false },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxRotation: 45,
            minRotation: 45,
            padding: 8,
            font: { size: 11 }
          },
          grid: { display: false }
        },
        y: { 
          beginAtZero: true, 
          ticks: { precision: 0 } 
        }
      }
    }
  });
}

// ---------------------------
// RESET: delete BOTH inventory + stats_daily (admin only)
// ---------------------------
async function deleteCollectionAll(collName, chunkSize = 400){
  while(true){
    const snap = await getDocs(query(collection(db, collName), limit(chunkSize)));
    if(snap.empty) break;

    const batch = writeBatch(db);
    snap.forEach(ds => batch.delete(ds.ref));
    await batch.commit();
  }
}

function openResetModal(){
  const overlay = qs("#resetModal");
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden","false");
  qs("#resetPassword").value = "";
  qs("#resetError").hidden = true;
  setTimeout(() => qs("#resetPassword").focus(), 50);
}

function closeResetModal(){
  const overlay = qs("#resetModal");
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden","true");
}

async function confirmReset(){
  const pw = qs("#resetPassword").value;
  const err = qs("#resetError");

  if(pw !== RESET_PASSWORD){
    err.hidden = false;
    return;
  }

  // delete firestore collections (admin-only)
  try{
    await deleteCollectionAll("inventory");
    await deleteCollectionAll("stats_daily");
  }catch(e){
    console.error(e);
    alert("Reset failed. Check console (rules/admin login).");
    return;
  }

  closeResetModal();
  await renderTable();

  // refresh graph view if currently open
  // (safe even if not open)
  try{
    await rebuildStatsDaily(30);
    await renderGraphFromStatsDaily(30);
  }catch{}
}

// ---------------------------
// Wiring
// ---------------------------
function wireSidebar(){
  qs("#btnMain").addEventListener("click", () => {
    window.location.href = "index.html";
  });

  qs("#btnEnrollees").addEventListener("click", async () => {
    setActiveSidebar("btnEnrollees");
    showPage("pageEnrollees");
    await renderTable();
  });

  qs("#btnGraph").addEventListener("click", async () => {
    setActiveSidebar("btnGraph");
    showPage("pageGraph");

    // FREE plan flow:
    // rebuild stats_daily from inventory, then render graph from stats_daily
    await rebuildStatsDaily(30);
    await renderGraphFromStatsDaily(30);
  });

  qs("#btnReset").addEventListener("click", () => {
    setActiveSidebar("btnReset");
    openResetModal();
  });

  qs("#btnTheme").addEventListener("click", toggleTheme);
}

function wireGradeTabs(){
  qsa(".gradeTab").forEach(btn => {
    btn.addEventListener("click", () => {
      activeGrade = btn.dataset.grade;

      qsa(".gradeTab").forEach(x => x.classList.toggle("active", x.dataset.grade === activeGrade));
      activeSection = (gradeSections[activeGrade] || [])[0] || "";
      renderSectionTabs();
    });
  });
}

function wireModal(){
  const overlay = qs("#resetModal");

  qs("#btnCancelReset").addEventListener("click", closeResetModal);
  qs("#btnConfirmReset").addEventListener("click", confirmReset);

  overlay.addEventListener("click", (e) => {
    if(e.target === overlay) closeResetModal();
  });

  window.addEventListener("keydown", (e) => {
    if(!overlay.classList.contains("show")) return;
    if(e.key === "Escape") closeResetModal();
    if(e.key === "Enter") confirmReset();
  });

  qs("#resetPassword").addEventListener("input", () => {
    qs("#resetError").hidden = true;
  });
}

// ---------------------------
// Init
// ---------------------------
(function init(){
  const saved = localStorage.getItem("cnhs_theme");
  applyTheme(saved === "night" ? "night" : "day");

  showPage("pageEnrollees");
  setActiveSidebar("btnEnrollees");

  wireSidebar();
  wireGradeTabs();
  wireModal();

  qsa(".gradeTab").forEach(x => x.classList.toggle("active", x.dataset.grade === activeGrade));

  renderSectionTabs();
})();
// ✅ ADDED: fallback query if composite index not ready



// ======================
// ADDED v7: SEPARATE LINE GRAPHS PER GRADE (4 SMALL CHARTS)
// Goal: hindi na magkakasama sa isang chart para kita agad bawat grade.
// No deletions: we add a new UI + new realtime renderer.
// ======================
let __cnhs_gradeCharts_v7 = []; // [{grade, chart, canvasId}]

function __cnhs_makeGradeChartsLayout_v7(){
  const page = document.getElementById("pageGraph") || document.body;
  const existingWrap = document.getElementById("__cnhs_gradeChartsWrap_v7");
  if(existingWrap) return existingWrap;

  // Hide old combined canvas to avoid clutter
  const oldCanvas = document.getElementById("dailyChart");
  if(oldCanvas){
    oldCanvas.style.display = "none";
  }

  const wrap = document.createElement("div");
  wrap.id = "__cnhs_gradeChartsWrap_v7";
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = "1fr 1fr";
  wrap.style.gap = "16px";
  wrap.style.marginTop = "12px";
  wrap.style.width = "100%";

  // Try to insert under the graph header
  const header = page.querySelector(".graphHeader") || [...page.querySelectorAll("h2")].find(h => (h.textContent||"").toUpperCase().includes("ENROLLEES"));
  const insertTarget = header?.parentElement || page;

  GRADES.forEach((g, idx) => {
    const card = document.createElement("div");
    card.style.width = "100%";
    card.style.minHeight = "240px";
    card.style.height = "240px";
    card.style.position = "relative";
    card.style.borderRadius = "14px";
    card.style.overflow = "hidden";
    card.style.padding = "10px";
    card.style.boxSizing = "border-box";
    card.style.background = "rgba(255,255,255,0.04)";
    card.style.border = "1px solid rgba(255,255,255,0.08)";

    const title = document.createElement("div");
    title.textContent = g;
    title.style.fontWeight = "700";
    title.style.marginBottom = "6px";
    title.style.opacity = "0.9";
    title.style.fontSize = "14px";

    const inner = document.createElement("div");
    inner.style.position = "relative";
    inner.style.width = "100%";
    inner.style.height = "190px";

    const canvas = document.createElement("canvas");
    const cid = `dailyChart_${idx}_v7`;
    canvas.id = cid;
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    inner.appendChild(canvas);
    card.appendChild(title);
    card.appendChild(inner);
    wrap.appendChild(card);
  });

  insertTarget.appendChild(wrap);
  return wrap;
}

function __cnhs_destroyGradeCharts_v7(){
  try{
    __cnhs_gradeCharts_v7.forEach(x => { try{x.chart?.destroy();}catch(e){} });
  }catch(e){}
  __cnhs_gradeCharts_v7 = [];
}

// Realtime listener dedicated for v7 layout
let __cnhs_unsub_daily_v7 = null;
function __cnhs_stopDailyListener_v7(){
  try{ if(__cnhs_unsub_daily_v7) __cnhs_unsub_daily_v7(); }catch(e){}
  __cnhs_unsub_daily_v7 = null;
}

async function __cnhs_listenStatsDailyAndRenderSplit_v7(daysBack = 30){
  try{
    __cnhs_makeGradeChartsLayout_v7();

    const mod = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
    const onSnapshot = mod.onSnapshot;

    __cnhs_stopDailyListener_v7();

    const end = new Date();
    end.setHours(23,59,59,999);

    const start = new Date();
    start.setDate(start.getDate() - (daysBack - 1));
    start.setHours(0,0,0,0);

    const startId = dateIdFromDate(start);
    const endId   = dateIdFromDate(end);

    const qy = query(
      collection(db, "stats_daily"),
      orderBy(FieldPath.documentId()),
      where(FieldPath.documentId(), ">=", startId),
      where(FieldPath.documentId(), "<=", endId)
    );

    __cnhs_unsub_daily_v7 = onSnapshot(qy, (snap) => {
      const labels = [];
      const rows = [];
      snap.forEach(ds => {
        labels.push(ds.id);
        rows.push(ds.data());
      });

      __cnhs_destroyGradeCharts_v7();

      GRADES.forEach((g, idx) => {
        const canvas = document.getElementById(`dailyChart_${idx}_v7`);
        if(!canvas) return;

        const data = rows.map(r => r?.[g] || 0);

        const ch = new Chart(canvas, {
          type: "line",
          data: {
            labels: labels.length ? labels : ["No data"],
            datasets: [
              {
                label: g,
                data: labels.length ? data : [0],
                tension: 0.25,
                fill: false,
                pointRadius: 3,
                pointHoverRadius: 5,
                borderWidth: 3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { mode: "index", intersect: false }
            },
            interaction: { mode: "nearest", axis: "x", intersect: false },
            scales: {
              y: { beginAtZero: true, ticks: { precision: 0 } },
              x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } }
            }
          }
        });

        __cnhs_gradeCharts_v7.push({ grade: g, chart: ch, canvasId: canvas.id });
      });
    });
  }catch(e){
    console.error("v7 split graph failed:", e);
  }
}

// Start v7 split charts when clicking GRAPH
(() => {
  const btn = document.getElementById("btnGraph");
  if(!btn) return;
  btn.addEventListener("click", () => {
    setTimeout(() => __cnhs_listenStatsDailyAndRenderSplit_v7(30), 450);
  });
})();



// ======================
// ADDED v8: SCROLLBAR for Graph section + PREVENT AUTO-REBUILD RESET
// - Adds vertical scroll inside Graph page so charts won't be cut off
// - Prevents old btnGraph handler (rebuildStatsDaily) from running, so stats_daily won't be "reset per day"
//   (stats only changes when you use RESET button / your own reset logic)
// ======================

// Inject minimal CSS for scroll area (ADD only)
(function __cnhs_graphScrollCss_v8(){
  const css = `
    #pageGraph { overflow-y: auto; }
    #pageGraph .graphWrap { overflow-y: auto; }
    #__cnhs_gradeChartsWrap_v7 { padding-bottom: 18px; }
  `;
  const style = document.createElement("style");
  style.id = "__cnhs_graph_scroll_css_v8";
  style.textContent = css;
  document.head.appendChild(style);

  // Force a max height for the graph page area so scrolling works (safe defaults)
  const pg = document.getElementById("pageGraph");
  if(pg){
    pg.style.maxHeight = "calc(100vh - 120px)";
    pg.style.overflowY = "auto";
  }
  const gw = pg?.querySelector(".graphWrap");
  if(gw){
    gw.style.maxHeight = "calc(100vh - 160px)";
    gw.style.overflowY = "auto";
  }
})();

// Stop the OLD Graph click handler (which may call rebuildStatsDaily) so it won't overwrite stats_daily.
// We use capture-phase listener to stop propagation before existing listeners run.
(function __cnhs_blockOldGraphHandler_v8(){
  const btn = document.getElementById("btnGraph");
  if(!btn) return;

  btn.addEventListener("click", (e) => {
    try{
      e.preventDefault();
      e.stopImmediatePropagation(); // blocks other listeners on same element
      e.stopPropagation();
    }catch(err){}

    // Show graph page if the old code was doing it; keep compatibility:
    try{ if(typeof setActiveSidebar === "function") setActiveSidebar("btnGraph"); }catch(err){}
    try{ if(typeof showPage === "function") showPage("pageGraph"); }catch(err){}

    // Start our split realtime charts
    setTimeout(() => {
      try{ __cnhs_listenStatsDailyAndRenderSplit_v7(30); }catch(err){ console.error(err); }
    }, 250);
  }, true); // capture = true
})();



// ======================
// ADDED v9: FIX NESTED SCROLL + BIG EMPTY SPACE (clean Graph layout)
// Problem seen in screenshot: may inner scrollbar sa chart area + malaking blank space sa baba.
// Fix: use ONE scrollbar only (pageGraph), disable inner overflow, and make charts wrap align to top.
// ======================
(function __cnhs_graphLayoutFix_v9(){
  const css = `
    /* Use single scroll container */
    #pageGraph { 
      overflow-y: auto !important; 
      height: calc(100vh - 120px) !important;
      max-height: calc(100vh - 120px) !important;
    }
    /* Remove inner scrollbars that cause cut/blank */
    #pageGraph .graphWrap { 
      overflow: visible !important; 
      max-height: none !important; 
      height: auto !important;
    }
    /* Keep charts grid pinned to top and avoid huge gaps */
    #__cnhs_gradeChartsWrap_v7 {
      align-content: start !important;
      justify-content: stretch !important;
      margin-bottom: 20px !important;
    }
    /* Make each chart card taller so lines are visible */
    #__cnhs_gradeChartsWrap_v7 > div {
      height: 280px !important;
      min-height: 280px !important;
    }
    #__cnhs_gradeChartsWrap_v7 > div > div:last-child {
      height: 220px !important;
    }
  `;
  const style = document.createElement("style");
  style.id = "__cnhs_graph_layout_fix_v9";
  style.textContent = css;
  document.head.appendChild(style);

  // Also adjust at runtime (in case elements already exist)
  const pg = document.getElementById("pageGraph");
  if(pg){
    pg.style.overflowY = "auto";
    pg.style.height = "calc(100vh - 120px)";
    pg.style.maxHeight = "calc(100vh - 120px)";
  }
  const gw = pg?.querySelector(".graphWrap");
  if(gw){
    gw.style.overflow = "visible";
    gw.style.maxHeight = "none";
    gw.style.height = "auto";
  }
  const wrap = document.getElementById("__cnhs_gradeChartsWrap_v7");
  if(wrap){
    wrap.style.alignContent = "start";
  }
  // ======================
// ADDED v10: DAILY RESET FIX (stats_daily should be per-day, not cumulative)
// - Overwrite stats_daily docs (NO merge) so yesterday won't carry into today
// - Pre-fill missing days with zeros (so no stale values)
// - Use fixed TZ (UTC+8) day boundaries to avoid midnight issues
// ======================
(function __cnhs_dailyResetFix_v10(){
  const TZ_OFFSET_MIN = 8 * 60; // UTC+8 (PH)

  function __pad2(n){ return String(n).padStart(2, "0"); }

  // Convert "now" into a dateId based on TZ offset (YYYY-MM-DD)
  function __dateIdFromMillisTZ(ms, tzOffsetMin){
    const d = new Date(ms + tzOffsetMin * 60 * 1000); // shift into TZ
    const yyyy = d.getUTCFullYear();
    const mm   = __pad2(d.getUTCMonth() + 1);
    const dd   = __pad2(d.getUTCDate());
    return `${yyyy}-${mm}-${dd}`;
  }

  // Start-of-day in UTC millis for a given TZ (so Firestore Timestamp compares correctly)
  function __startOfDayUtcMillisTZ(date, tzOffsetMin){
    const ms = date.getTime();
    const shifted = ms + tzOffsetMin * 60 * 1000; // shift into TZ
    const d = new Date(shifted);
    const yyyy = d.getUTCFullYear();
    const mm = d.getUTCMonth();
    const dd = d.getUTCDate();
    const startShifted = Date.UTC(yyyy, mm, dd, 0,0,0,0); // midnight in TZ (but stored as UTC in shifted space)
    return startShifted - tzOffsetMin * 60 * 1000; // shift back to UTC millis
  }

  function __endOfDayUtcMillisTZ(date, tzOffsetMin){
    return __startOfDayUtcMillisTZ(date, tzOffsetMin) + (24*60*60*1000) - 1;
  }

  function __dateIdFromTimestampTZ(ts){
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if(!d || isNaN(d.getTime())) return null;
    return __dateIdFromMillisTZ(d.getTime(), TZ_OFFSET_MIN);
  }

  async function __rebuildStatsDailyOverwrite_v10(daysBack = 30){
    // Use TZ-safe range
    const now = new Date();
    const endUtcMs = __endOfDayUtcMillisTZ(now, TZ_OFFSET_MIN);

    const startBase = new Date(now);
    startBase.setDate(startBase.getDate() - (daysBack - 1));
    const startUtcMs = __startOfDayUtcMillisTZ(startBase, TZ_OFFSET_MIN);

    const start = new Date(startUtcMs);
    const end   = new Date(endUtcMs);

    // 1) Pre-fill all days with zeros so nothing "stays" from old runs
    const map = new Map();
    for(let i=0; i<daysBack; i++){
      const dayUtcMs = startUtcMs + i * 24*60*60*1000;
      const dateId = __dateIdFromMillisTZ(dayUtcMs, TZ_OFFSET_MIN);
      const init = {};
      GRADES.forEach(g => init[g] = 0);
      map.set(dateId, init);
    }

    // 2) Query inventory in range
    const qy = query(
      collection(db, "inventory"),
      where("createdAt", ">=", start),
      where("createdAt", "<=", end),
      orderBy("createdAt", "asc")
    );

    const snap = await getDocs(qy);

    // 3) Count per-day per-grade (TZ-safe)
    snap.forEach(ds => {
      const data = ds.data();
      const grade = String(data.grade || "").trim();
      if(!GRADES.includes(grade)) return;

      const dateId = __dateIdFromTimestampTZ(data.createdAt);
      if(!dateId) return;

      if(!map.has(dateId)){
        const init = {};
        GRADES.forEach(g => init[g] = 0);
        map.set(dateId, init);
      }
      map.get(dateId)[grade] += 1;
    });

    // 4) OVERWRITE stats_daily docs (NO MERGE!)
    const batch = writeBatch(db);
    for(const [dateId, counts] of map.entries()){
      const ref = doc(db, "stats_daily", dateId);
      // overwrite fields so yesterday won't leak into today
      batch.set(ref, { ...counts, updatedAt: serverTimestamp() }); // <-- no merge
    }
    await batch.commit();
  }

  // ---- Patch existing functions (ADD only) ----
  try{
    // Replace helper used by old rebuild
    if(typeof dateIdFromTimestamp === "function"){
      dateIdFromTimestamp = __dateIdFromTimestampTZ;
    }
  }catch(e){}

  // Replace old rebuildStatsDaily so even if something calls it, it overwrites cleanly
  try{
    if(typeof rebuildStatsDaily === "function"){
      rebuildStatsDaily = __rebuildStatsDailyOverwrite_v10;
    }
  }catch(e){}

  // Make sure v7 split graph listener always rebuilds clean before showing charts
  try{
    if(typeof __cnhs_listenStatsDailyAndRenderSplit_v7 === "function"){
      const __orig = __cnhs_listenStatsDailyAndRenderSplit_v7;
      __cnhs_listenStatsDailyAndRenderSplit_v7 = async function(daysBack = 30){
        try{ await __rebuildStatsDailyOverwrite_v10(daysBack); }catch(err){ console.warn("v10 rebuild failed:", err); }
        return __orig(daysBack);
      };
    }
  }catch(e){}
// ======================
// ADDED v11: FIX DATE LABELS (too many dates shown on X axis)
// - Format labels to MM-DD
// - Force autoskip + limit tick count
// - Use shorter range (14 days) when clicking GRAPH
// ======================
(function __cnhs_fixDateAxis_v11(){
  function __formatLabelToMMDD(lbl){
    // expects "YYYY-MM-DD"
    if(typeof lbl !== "string") return lbl;
    if(lbl.length >= 10 && lbl[4] === "-" && lbl[7] === "-") return lbl.slice(5); // "MM-DD"
    return lbl;
  }

  function __patchChartAxis(ch){
    try{
      if(!ch?.options?.scales?.x) return;
      const x = ch.options.scales.x;

      x.ticks = x.ticks || {};
      x.ticks.autoSkip = true;
      x.ticks.maxRotation = 0;
      x.ticks.minRotation = 0;
      x.ticks.maxTicksLimit = 6; // show fewer labels

      // IMPORTANT: category scale tick callback uses (value, index, ticks)
      x.ticks.callback = function(value, index, ticks){
        const labels = ch?.data?.labels || [];
        const raw = labels[value] ?? labels[index] ?? value;
        return __formatLabelToMMDD(raw);
      };

      ch.update();
    }catch(e){
      console.warn("v11 axis patch failed:", e);
    }
  }

  function __patchAllGradeCharts(){
    try{
      if(!Array.isArray(__cnhs_gradeCharts_v7)) return;
      __cnhs_gradeCharts_v7.forEach(x => __patchChartAxis(x.chart));
    }catch(e){}
  }

  // Patch charts whenever they appear/refresh
  const __origListen = (typeof __cnhs_listenStatsDailyAndRenderSplit_v7 === "function")
    ? __cnhs_listenStatsDailyAndRenderSplit_v7
    : null;

  if(__origListen){
    __cnhs_listenStatsDailyAndRenderSplit_v7 = async function(daysBack = 14){
      const res = await __origListen(daysBack);
      // charts are created after onSnapshot — wait a bit then patch
      setTimeout(__patchAllGradeCharts, 50);
      setTimeout(__patchAllGradeCharts, 300);
      return res;
    };
  }

  // Override GRAPH click to use 14 days + prevent old 30-day label spam
  const btn = document.getElementById("btnGraph");
  if(btn){
    btn.addEventListener("click", (e) => {
      // capture-phase override: stop other click handlers (including old one)
      e.preventDefault();
      e.stopImmediatePropagation();
      setTimeout(() => __cnhs_listenStatsDailyAndRenderSplit_v7(14), 450);
    }, true);
  }
})();

})();
})();

