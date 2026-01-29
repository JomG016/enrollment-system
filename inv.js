/* =========================================================
   DASHBOARD (inv.js) - FIREBASE VERSION
   - Keeps your UI logic
   - Loads table + graph from Firestore
========================================================= */

import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// -----------------------------
// CONFIG: tabs per grade (UI)
const SECTIONS_BY_GRADE = {
  "Grade 8": ["PYTHON", "EARTH", "JUPITER", "VENUS", "NEPTUNE"],
  "Grade 9": ["AZURE", "SILVER", "GOLD", "COPPER", "NICKEL"],
  "Grade 10": ["AI", "MABINI", "RIZAL", "BONIFACIO", "DEL-PILAR"],
  "Grade 12": ["HUMMS A", "HUMMS B", "ABM", "TVL-ICT", "TVL-HE"],
};

// -----------------------------
// DOM
const gradeTabs = document.querySelectorAll(".gradeTab");
const sectionTabsEl = document.getElementById("sectionTabs");

const btnMain = document.getElementById("btnMain");
const btnEnrollees = document.getElementById("btnEnrollees");
const btnGraph = document.getElementById("btnGraph");
const btnReset = document.getElementById("btnReset");

const pageEnrollees = document.getElementById("pageEnrollees");
const pageGraph = document.getElementById("pageGraph");

const btnTheme = document.getElementById("btnTheme");
const themeLabel = document.getElementById("themeLabel");

const tableBody = document.getElementById("tableBody");

let currentGrade = localStorage.getItem("dash_grade") || "Grade 8";
let currentSection =
  localStorage.getItem("dash_section") || SECTIONS_BY_GRADE[currentGrade][0];

let chartInstance = null;

// -----------------------------
// HELPERS
function setSideActive(btn) {
  [btnEnrollees, btnGraph].forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

function showPage(which) {
  if (which === "enrollees") {
    pageEnrollees.classList.add("active");
    pageGraph.classList.remove("active");
  } else {
    pageGraph.classList.add("active");
    pageEnrollees.classList.remove("active");
  }
}

function escapeHtml(x) {
  return String(x ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateToKey(ts) {
  // ts can be Firestore Timestamp or missing
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  } catch {
    return new Date().toLocaleDateString();
  }
}

// -----------------------------
// FIRESTORE LOADERS

async function fetchSectionRows(grade, section) {
  // Inventory collection is "inventory" from 8910.js save
  const qy = query(
    collection(db, "inventory"),
    where("targetGrade", "==", grade),
    where("targetSection", "==", section),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qy);
  const rows = [];
  snap.forEach((doc) => rows.push(doc.data()));
  return rows;
}

async function fetchGradeRowsForGraph(grade) {
  // For graph: we only filter by targetGrade and group by day
  const qy = query(
    collection(db, "inventory"),
    where("targetGrade", "==", grade),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qy);
  const rows = [];
  snap.forEach((doc) => rows.push(doc.data()));
  return rows;
}

// -----------------------------
// TABLE (NOW FROM FIREBASE)
async function renderTable() {
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr><td colspan="6" style="padding:14px;font-weight:700;">Loading...</td></tr>
  `;

  try {
    const rows = await fetchSectionRows(currentGrade, currentSection);

    tableBody.innerHTML = "";
    if (!rows.length) {
      tableBody.innerHTML = `
        <tr><td colspan="6" style="padding:14px;font-weight:700;">No records</td></tr>
      `;
      return;
    }

    rows.forEach((s) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.sex)}</td>
        <td>${escapeHtml(s.age)}</td>
        <td>${escapeHtml(s.gradeInput)}</td>
        <td>${escapeHtml(s.section)}</td>
        <td>${escapeHtml(s.lrn)}</td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `
      <tr><td colspan="6" style="padding:14px;font-weight:700;color:red;">
        Error loading data. Check console (F12).
      </td></tr>
    `;
  }
}

// -----------------------------
// GRAPH (NOW FROM FIREBASE)
async function renderGraph() {
  const canvas = document.getElementById("dailyChart");
  if (!canvas) return;

  try {
    const rows = await fetchGradeRowsForGraph(currentGrade);

    // Group by day
    const countsByDay = {};
    rows.forEach((r) => {
      const key = formatDateToKey(r.createdAt);
      countsByDay[key] = (countsByDay[key] || 0) + 1;
    });

    const labels = Object.keys(countsByDay).reverse(); // oldest -> newest
    const counts = labels.map((d) => countsByDay[d]);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: `${currentGrade} Enrollees / Day`,
            data: counts,
          },
        ],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
      },
    });
  } catch (err) {
    console.error(err);
  }
}

// -----------------------------
// TABS
function buildSectionTabs() {
  sectionTabsEl.innerHTML = "";
  const secs = SECTIONS_BY_GRADE[currentGrade] || [];

  secs.forEach((sec) => {
    const b = document.createElement("button");
    b.className = "tab sectionTab" + (sec === currentSection ? " active" : "");
    b.textContent = sec;

    b.addEventListener("click", async () => {
      currentSection = sec;
      localStorage.setItem("dash_section", currentSection);

      document
        .querySelectorAll(".sectionTab")
        .forEach((x) => x.classList.remove("active"));
      b.classList.add("active");

      await renderTable();
    });

    sectionTabsEl.appendChild(b);
  });
}

async function setGrade(grade) {
  currentGrade = grade;
  localStorage.setItem("dash_grade", currentGrade);

  gradeTabs.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.grade === currentGrade)
  );

  const secs = SECTIONS_BY_GRADE[currentGrade] || [];
  if (!secs.includes(currentSection)) currentSection = secs[0];
  localStorage.setItem("dash_section", currentSection);

  buildSectionTabs();
  await renderTable();
  if (pageGraph.classList.contains("active")) await renderGraph();
}

gradeTabs.forEach((btn) =>
  btn.addEventListener("click", async () => setGrade(btn.dataset.grade))
);

// -----------------------------
// BUTTONS
btnMain?.addEventListener("click", () => (window.location.href = "main.html"));

btnEnrollees?.addEventListener("click", async () => {
  setSideActive(btnEnrollees);
  showPage("enrollees");
  await renderTable();
});

btnGraph?.addEventListener("click", async () => {
  setSideActive(btnGraph);
  showPage("graph");
  await renderGraph();
});

// Reset here will only reset UI state (we won't delete Firestore data)
btnReset?.addEventListener("click", () => {
  alert(
    "Reset button is disabled for Firebase data (online). If you want, I can add an admin-only delete."
  );
});

// theme
btnTheme?.addEventListener("click", () => {
  const body = document.body;
  const isDay = body.classList.contains("day");
  if (isDay) {
    body.classList.remove("day");
    body.classList.add("night");
    themeLabel.textContent = "DAY MODE";
    localStorage.setItem("dash_theme", "night");
  } else {
    body.classList.remove("night");
    body.classList.add("day");
    themeLabel.textContent = "NIGHT MODE";
    localStorage.setItem("dash_theme", "day");
  }
});

// -----------------------------
// INIT
(async function init() {
  const savedTheme = localStorage.getItem("dash_theme") || "day";
  document.body.classList.remove("day", "night");
  document.body.classList.add(savedTheme);
  themeLabel.textContent = savedTheme === "night" ? "DAY MODE" : "NIGHT MODE";

  buildSectionTabs();

  // default page
  setSideActive(btnEnrollees);
  showPage("enrollees");

  // load initial grade/section
  await setGrade(currentGrade);
})();
