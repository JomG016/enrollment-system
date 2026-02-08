import { auth } from "./firebase-init.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

/**
 * ADMIN ONLY
 * 1) Require user to type an admin email (for intentionality + allowlist)
 * 2) Force login every time (session-only + signOut on load)
 * 3) No auto redirect (redirect only after button click + successful check)
 */

// 🔒 Put your admin emails here (lowercase)
const ADMIN_EMAILS = new Set([
  "carmennhsenrollment@gmail.com",
  // "anotheradmin@gmail.com",
]);

const emailInput = document.getElementById("adminEmail");
const googleBtn = document.getElementById("googleBtn");
const clearBtn = document.getElementById("clearBtn");
const backBtn = document.getElementById("backBtn");
const statusEl = document.getElementById("status");

function setStatus(msg, type) {
  statusEl.textContent = msg || "";
  statusEl.classList.remove("ok", "bad");
  if (type) statusEl.classList.add(type);
}

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

// ✅ Force “login again every time”
// - session persistence (dies when tab/browser closes)
// - signOut on page load so no existing session gets reused
await setPersistence(auth, browserSessionPersistence);
try { await signOut(auth); } catch (_) {}

setStatus("Please enter your admin email, then continue with Google.");

clearBtn.addEventListener("click", () => {
  emailInput.value = "";
  setStatus("Cleared.", "ok");
});

backBtn.addEventListener("click", () => {
  window.location.href = "./index.html";
});

googleBtn.addEventListener("click", async () => {
  setStatus("", "");
  googleBtn.disabled = true;

  try {
    const typedEmail = normalizeEmail(emailInput.value);
    if (!typedEmail) {
      setStatus("Type your admin email first.", "bad");
      return;
    }
    if (!ADMIN_EMAILS.has(typedEmail)) {
      setStatus("This email is not allowed (admin only).", "bad");
      return;
    }

    const provider = new GoogleAuthProvider();
    // Forces account picker every time
    provider.setCustomParameters({ prompt: "select_account" });

    const result = await signInWithPopup(auth, provider);
    const signedEmail = normalizeEmail(result.user?.email);

    if (!signedEmail || signedEmail !== typedEmail) {
      await signOut(auth);
      setStatus("Signed-in email does not match what you typed.", "bad");
      return;
    }

    if (!ADMIN_EMAILS.has(signedEmail)) {
      await signOut(auth);
      setStatus("Not authorized.", "bad");
      return;
    }

    setStatus("Login OK. Redirecting…", "ok");
    window.location.replace("./dashboard.html");
  } catch (e) {
    console.error(e);
    setStatus(e.code || e.message || "Google login failed.", "bad");
  } finally {
    googleBtn.disabled = false;
  }
});
