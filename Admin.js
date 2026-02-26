import { auth } from "./firebase-init.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// ✅ Admin allowlist (edit as needed)
const ADMIN_EMAILS = new Set([
  "carmennhsenrollment@gmail.com",
]);

const emailInput = document.getElementById("adminEmail");
const googleBtn = document.getElementById("googleBtn");
const statusEl = document.getElementById("status");

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}
function setStatus(msg, type) {
  statusEl.textContent = msg || "";
  statusEl.classList.remove("ok", "bad");
  if (type) statusEl.classList.add(type);
}

// ✅ (Recommended) local persistence para mas consistent across reloads
await setPersistence(auth, browserLocalPersistence);

// ✅ helper: detect in-app browsers (Messenger/FB/IG) na madalas sumablay
function isInAppBrowser() {
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line|Twitter|TikTok/i.test(ua);
}

function makeProvider() {
  const provider = new GoogleAuthProvider();
  // pipilitin pumili ng account (avoid wrong account auto-selected)
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

  setStatus("Login OK. Redirecting…", "ok");
  window.location.replace("./dashboard.html");
}

// ✅ 1) ALWAYS handle redirect result on page load
try {
  const rr = await getRedirectResult(auth);
  if (rr?.user) {
    await finishLogin(rr.user);
  }
} catch (e) {
  console.error(e);
  setStatus(e.code || e.message || "Redirect login failed.", "bad");
}

// ✅ 2) Button click: desktop popup, mobile redirect, popup fallback to redirect
googleBtn.addEventListener("click", async () => {
  setStatus("", "");
  googleBtn.disabled = true;

  try {
    // Optional: keep your “type email first” UX
    const typedEmail = normalizeEmail(emailInput.value);
    if (!typedEmail) {
      setStatus("Enter the Email.", "bad");
      return;
    }
    // NOTE: wag mo i-require na match ang typedEmail sa signed email;
    // allowlist check na lang ang “security”
    if (!ADMIN_EMAILS.has(typedEmail)) {
      setStatus("Wrong admin email (not allowed).", "bad");
      return;
    }

    if (isInAppBrowser()) {
      setStatus("Open in Chrome/Safari.", "bad");
      // itutuloy pa rin natin sa redirect kasi pinaka compatible
    }

    const provider = makeProvider();
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      // ✅ mobile: redirect
      await signInWithRedirect(auth, provider);
      return;
    }

    // ✅ desktop: popup
    const result = await signInWithPopup(auth, provider);
    await finishLogin(result.user);

  } catch (e) {
    console.error(e);

    // ✅ fallback: kapag blocked ang popup, redirect na lang
    if (e?.code === "auth/popup-blocked" || e?.code === "auth/popup-closed-by-user") {
      try {
        const provider = makeProvider();
        await signInWithRedirect(auth, provider);
        return;
      } catch (e2) {
        console.error(e2);
        setStatus(e2.code || e2.message || "Redirect fallback failed.", "bad");
        return;
      }
    }

    setStatus(e.code || e.message || "Google login failed.", "bad");
  } finally {
    googleBtn.disabled = false;
  }
});