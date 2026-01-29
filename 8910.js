import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* =========================
   ROUTING RULES
========================= */
const REGULAR_ROUTES = {
  "Grade 7": {
    "SAMPAGUITA": { grade: "Grade 8", section: "EARTH" },
    "JASMIN": { grade: "Grade 8", section: "JUPITER" },
    "ORCHIDS": { grade: "Grade 8", section: "NEPTUNE" },
    "DAISY": { grade: "Grade 8", section: "VENUS" }
  }
};

const SPICT = ["PYTHON", "AZURE", "AI"];

function getGradeFromYouAre(text) {
  const t = text.toUpperCase();
  if (t.includes("GRADE 7")) return "Grade 7";
  if (t.includes("GRADE 8")) return "Grade 8";
  if (t.includes("GRADE 9")) return "Grade 9";
  if (t.includes("GRADE 10")) return "Grade 10";
  return null;
}

function normalizeSection(s) {
  return s.toUpperCase().replace(/^\d+\s*-\s*/, "");
}

function routeStudent(inputGrade, section) {
  // SP-ICT: same section, next grade
  if (SPICT.includes(section)) {
    const n = parseInt(inputGrade.replace("Grade ", ""));
    return { grade: `Grade ${n + 1}`, section };
  }

  // REGULAR
  const rule = REGULAR_ROUTES?.[inputGrade]?.[section];
  return rule || null;
}

/* =========================
   SUBMIT
========================= */
document.getElementById("submitBtn").addEventListener("click", async () => {
  const data = {
    name: name.value.trim(),
    sex: sex.value.trim(),
    age: age.value.trim(),
    gradeInput: grade.value.trim(),
    section: normalizeSection(section.value.trim()),
    lrn: lrn.value.trim(),
    youAre: youAreInput.value.trim()
  };

  const inputGrade = getGradeFromYouAre(data.youAre);
  if (!inputGrade) return alert("Invalid grade");

  const dest = routeStudent(inputGrade, data.section);
  if (!dest) return alert("No route found");

  // SAVE ONLINE 🔥
  await addDoc(collection(db, "inventory"), {
    ...data,
    targetGrade: dest.grade,
    targetSection: dest.section,
    createdAt: serverTimestamp()
  });

  window.location.href = "finish.html";
});
