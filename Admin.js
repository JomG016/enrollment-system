import { auth } from "./firebase-init.js";
import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const ADMIN_EMAILS = new Set([
  "carmennhsenrollment@gmail.com"
]);

const emailInput = document.getElementById("adminEmail");
const googleBtn = document.getElementById("googleBtn");
const statusEl = document.getElementById("status");

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

await setPersistence(auth, browserLocalPersistence);

// 🔥 Always detect logged-in user
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const email = normalizeEmail(user.email);

  if (!ADMIN_EMAILS.has(email)) {
    await signOut(auth);
    alert("Not authorized");
    return;
  }

  window.location.replace("./dashboard.html");
});

// 🔥 Handle redirect return
try {
  const result = await getRedirectResult(auth);
  if (result?.user) {
    const email = normalizeEmail(result.user.email);

    if (!ADMIN_EMAILS.has(email)) {
      await signOut(auth);
      alert("Not authorized");
      return;
    }

    window.location.replace("./dashboard.html");
  }
} catch (e) {
  console.error(e);
}

googleBtn.addEventListener("click", async () => {
  const typedEmail = normalizeEmail(emailInput.value);

  if (!typedEmail) {
    alert("Enter admin email first.");
    return;
  }

  if (!ADMIN_EMAILS.has(typedEmail)) {
    alert("Wrong admin email.");
    return;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account"
  });

  // 🔥 Always redirect (works on mobile + desktop)
  await signInWithRedirect(auth, provider);
});