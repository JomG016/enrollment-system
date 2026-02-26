import { auth } from "./firebase-init.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const ADMIN_EMAILS = new Set(["carmennhsenrollment@gmail.com"]);

const emailInput = document.getElementById("adminEmail");
const googleBtn = document.getElementById("googleBtn");
const statusEl = document.getElementById("status");

function normalizeEmail(v) { return String(v || "").trim().toLowerCase(); }
function setStatus(msg, type) {
  statusEl.textContent = msg || "";
  statusEl.classList.remove("ok", "bad");
  if (type) statusEl.classList.add(type);
}

await setPersistence(auth, browserLocalPersistence);

function isInAppBrowser() {
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line|Twitter|TikTok/i.test(ua);
}
function makeProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

async function finishLogin(user) {
  const signedEmail = normalizeEmail(user?.email);

  if (!ADMIN_EMAILS.has(signedEmail)) {
    await signOut(auth);
    setStatus("Not authorized (admin only).", "bad");
    return;
  }

  // ✅ once signed-in, go dashboard
  window.location.replace("./dashboard.html");
}

/**
 * ✅ SUPER IMPORTANT:
 * Even if getRedirectResult returns null on some mobiles,
 * onAuthStateChanged will still fire if user is actually signed in.
 */
let handled = false;
onAuthStateChanged(auth, async (user) => {
  if (handled) return;
  if (user) {
    handled = true;
    await finishLogin(user);
  }
});

// (optional) still keep this for extra compatibility
try {
  const rr = await getRedirectResult(auth);
  if (rr?.user) {
    handled = true;
    await finishLogin(rr.user);
  }
} catch (e) {
  console.error(e);
  setStatus(e.code || e.message || "Redirect login failed.", "bad");
}

googleBtn.addEventListener("click", async () => {
  setStatus("", "");
  googleBtn.disabled = true;

  let redirecting = false;

  try {
    const typedEmail = normalizeEmail(emailInput.value);
    if (!typedEmail) { setStatus("Enter the Email.", "bad"); return; }
    if (!ADMIN_EMAILS.has(typedEmail)) { setStatus("Wrong admin email (not allowed).", "bad"); return; }

    const provider = makeProvider();
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // in-app browser → redirect
    if (isInAppBrowser() || isMobile) {
      redirecting = true;
      await signInWithRedirect(auth, provider);
      return;
    }

    // desktop → popup
    const result = await signInWithPopup(auth, provider);
    await finishLogin(result.user);

  } catch (e) {
    console.error(e);
    if (e?.code === "auth/popup-blocked" || e?.code === "auth/popup-closed-by-user") {
      const provider = makeProvider();
      redirecting = true;
      await signInWithRedirect(auth, provider);
      return;
    }
    setStatus(e.code || e.message || "Google login failed.", "bad");
  } finally {
    if (!redirecting) googleBtn.disabled = false;
  }
});