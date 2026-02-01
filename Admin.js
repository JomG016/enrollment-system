import { auth } from "./firebase-init.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

await setPersistence(auth, browserLocalPersistence);

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("username");   // email
const passwordInput = document.getElementById("password");

const userError = document.getElementById("userError");
const togglePassBtn = document.getElementById("togglePass");

togglePassBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  const hidden = passwordInput.type === "password";
  passwordInput.type = hidden ? "text" : "password";
  togglePassBtn.textContent = hidden ? "hide" : "show";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault(); // ✅ prevents URL ?username=&password=
  userError.textContent = "";

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.assign("./dashboard.html");
  } catch (err) {
    console.error(err);
    // ✅ show real reason
    userError.textContent = err.code || "Login failed";
  }
});
