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
  "Grade 12": ["HUMMS A","HUMMS B","ABM","TVL-ICT","TVL-HE"]
};

const adviserByGradeSection = {
  "Grade 8|PYTHON": "MARY GRACE NOVIDA ADOR DONICIO",
  "Grade 8|EARTH": "DI PA ALAM ANG TEACHER",
  "Grade 8|JUPITER": "HERBERT L. BAUTISTA",
  "Grade 8|VENUS": "ROSE ANN M. CASTILLO",
  "Grade 8|NEPTUNE": "DI PA ALAM",

  "Grade 9|AZURE": "JEM B. SANTIAGO",
  "Grade 9|SILVER": "NESSY V. GABOY",
  "Grade 9|COPPER": "EWAN KO",
  "Grade 9|GOLD": "DI PA ALAM",
  "Grade 9|NICKEL": "DI PA ALAM",

  "Grade 10|AI": "MERRYLYN P. PALAPAL",
  "Grade 10|MABINI": "CHERRY R. SANTOS",
  "Grade 10|RIZAL": "MELIZZA CALUBANA",
  "Grade 10|BONIFACIO": "GIRLIE JOY H. YAMBAO",
  "Grade 10|DEL-PILAR": "JOCELYN T. DAGA",

  "Grade 12|HUMMS A": "DI PA ALAM",
  "Grade 12|HUMMS B": "DI PA ALAM",
  "Grade 12|ABM": "DI PA ALAM",
  "Grade 12|TVL-ICT": "DI PA ALAM",
  "Grade 12|TVL-HE": "DI PA ALAM",
};

let activeGrade = "Grade 8";
let activeSection = gradeSections[activeGrade][0];

function updateAdviser(){
  const key = `${activeGrade}|${activeSection}`;
  qs("#adviserName").textContent = adviserByGradeSection[key] || "DI PA ALAM";
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
        y: { beginAtZero: true, ticks: { precision: 0 } }
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
    window.location.href = "main.html";
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
