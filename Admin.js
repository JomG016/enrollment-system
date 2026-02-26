import { auth } from "./firebase-init.js";
import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

/**
 * ADMIN ONLY
 * 1) Require user to type an admin email (intentionality + allowlist)
 * 2) Use redirect sign-in (works on mobile + desktop + fresh devices)
 * 3) After successful sign-in, redirect to dashboard.html
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

// ✅ Session-only persistence (same vibe as your old code)
await setPersistence(auth, browserSessionPersistence);

// ✅ IMPORTANT: handle redirect result FIRST (do NOT signOut before this)
try {
  const rr = await getRedirectResult(auth);

  if (rr?.user?.email) {
    const signedEmail = normalizeEmail(rr.user.email);

    // Allowlist check
    if (!ADMIN_EMAILS.has(signedEmail)) {
      await signOut(auth);
      setStatus("Not authorized (admin only).", "bad");
    } else {
      setStatus("Login OK. Redirecting…", "ok");
      window.location.replace("./dashboard.html");
    }
  }
} catch (e) {
  console.error(e);
  setStatus(e.code || e.message || "Redirect login failed.", "bad");
}

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
    provider.setCustomParameters({ prompt: "select_account" });

    // ✅ Works on mobile + desktop + any device
    await signInWithRedirect(auth, provider);
    // after redirect, Google will return here and getRedirectResult() above will run
    return;

  } catch (e) {
    console.error(e);
    setStatus(e.code || e.message || "Google login failed.", "bad");
  } finally {
    // page is about to redirect, but just in case it doesn't:
    googleBtn.disabled = false;
  }
});