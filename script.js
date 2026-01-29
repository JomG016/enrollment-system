const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const previewImg = document.getElementById("previewImg");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const logBox = document.getElementById("logBox");

const backBtn = document.getElementById("backBtn");
const submitBtn = document.getElementById("submitBtn");

const dropdownToggle = document.getElementById("dropdownToggle");
const dropdownMenu = document.getElementById("dropdownMenu");
const youAreInput = document.getElementById("youAreInput");

const fields = {
  name: document.getElementById("name"),
  sex: document.getElementById("sex"),
  age: document.getElementById("age"),
  grade: document.getElementById("grade"),
  section: document.getElementById("section"),
  lrn: document.getElementById("lrn"),
};

let selectedFile = null;
let previewDataUrl = null;

// ---------- Preview image ----------
fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  selectedFile = file;

  const reader = new FileReader();
  reader.onload = () => {
    previewDataUrl = reader.result;
    previewImg.src = previewDataUrl;
    previewImg.style.display = "block";
    previewPlaceholder.style.display = "none";
  };
  reader.readAsDataURL(file);

  logBox.textContent = ""; // clear black box
});

// ---------- Dropdown ----------
function closeDropdown() {
  dropdownMenu.classList.remove("open");
  dropdownToggle.setAttribute("aria-expanded", "false");
}

dropdownToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = dropdownMenu.classList.toggle("open");
  dropdownToggle.setAttribute("aria-expanded", String(isOpen));
});

dropdownMenu.addEventListener("click", (e) => {
  const btn = e.target.closest(".dropdown-item");
  if (!btn) return;
  youAreInput.value = btn.textContent.trim();
  closeDropdown();
});

document.addEventListener("click", closeDropdown);

// ---------- Navigation ----------
backBtn.addEventListener("click", () => {
  window.location.href = "main.html";
});

// ---------- Validation ----------
function validateForm() {
  const errors = [];

  if (!fields.name.value.trim()) errors.push("Name is required");
  if (!fields.sex.value.trim()) errors.push("Sex is required");
  if (!fields.age.value.trim()) errors.push("Age is required");
  if (!fields.grade.value.trim()) errors.push("Grade is required");
  if (!fields.section.value.trim()) errors.push("Section is required");
  if (!fields.lrn.value.trim() || fields.lrn.value.length !== 12)
    errors.push("LRN must be exactly 12 digits");
  if (!youAreInput.value.trim()) errors.push("Please select who you are");
  if (!selectedFile) errors.push("Please upload a file");

  return errors;
}

submitBtn.addEventListener("click", () => {
  const validationErrors = validateForm();

  if (validationErrors.length > 0) {
    alert("Please complete all requirements:\n\n" + validationErrors.join("\n"));
    return;
  }

  window.location.href = "finish.html";
});


// ✅✅✅ Recognizing log (COUNTS UP FOREVER UNTIL STOPPED) ✅✅✅
function startRecognizingCounter() {
  logBox.textContent = "";
  let i = 1;

  const interval = setInterval(() => {
    logBox.textContent += `recognizing text (${i}).........\n`;
    logBox.scrollTop = logBox.scrollHeight;
    i++; // 1,2,3,4,... 11,12,13...
  }, 180);

  return () => clearInterval(interval);
}


// ---------- LRN extractor ----------
function extractLRN12(text) {
  const matches = text.match(/\d+/g) || [];
  return matches.find((m) => m.length === 12) || "";
}

// ---------- OCR helpers ----------
function normalizeOCRText(t) {
  return (t || "")
    .replace(/\r/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

function valueAfterLabel(text, label) {
  const re = new RegExp(
    `${label}\\s*:\\s*(.*?)\\s*(?=\\b(Name|Age|Sex|Grade|Section|LRN)\\b\\s*:|\\n|$)`,
    "i"
  );
  const m = text.match(re);
  if (!m) return "";
  return (m[1] || "").replace(/[_]+/g, " ").trim();
}

function parseFieldsFromOCR(rawText) {
  const text = normalizeOCRText(rawText);

  return {
    name: valueAfterLabel(text, "Name"),
    sex: valueAfterLabel(text, "Sex"),
    age: valueAfterLabel(text, "Age"),
    grade: valueAfterLabel(text, "Grade"),
    section: valueAfterLabel(text, "Section"),
    lrn: extractLRN12(text), // ONLY 12 digits
  };
}

function fillFieldIfFound(inputEl, value) {
  if (value) inputEl.value = value;
}

// ---------- OCR ----------
async function runOCR(imageDataUrl) {
  const result = await Tesseract.recognize(imageDataUrl, "eng");
  return result?.data?.text || "";
}


// ✅✅✅ Upload behavior (start counter, stop after OCR/autofill) ✅✅✅
uploadBtn.addEventListener("click", async () => {
  if (!selectedFile || !previewDataUrl) {
    alert("Please choose a file first.");
    return;
  }

  const stopRecognizing = startRecognizingCounter();

  try {
    const ocrText = await runOCR(previewDataUrl);
    const parsed = parseFieldsFromOCR(ocrText);

    fillFieldIfFound(fields.name, parsed.name);
    fillFieldIfFound(fields.sex, parsed.sex);
    fillFieldIfFound(fields.age, parsed.age);
    fillFieldIfFound(fields.grade, parsed.grade);
    fillFieldIfFound(fields.section, parsed.section);

    // LRN rule: EXACTLY 12 digits or do not fill
    if (parsed.lrn.length === 12) {
      fields.lrn.value = parsed.lrn;
    }
  } catch (e) {
    console.error(e);
  } finally {
    stopRecognizing();
  }
});

// ---------- LRN input restriction ----------
fields.lrn.addEventListener("input", () => {
  fields.lrn.value = fields.lrn.value.replace(/\D/g, "").slice(0, 12);
});
