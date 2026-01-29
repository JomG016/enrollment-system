const FIXED_USERNAME = "admin300796";
const FIXED_PASSWORD = "cnhsadmin300796";

const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const userError = document.getElementById("userError");
const passError = document.getElementById("passError");

const togglePassBtn = document.getElementById("togglePass");

function clearErrors() {
  userError.textContent = "";
  passError.textContent = "";
}

function setUserError(msg) {
  userError.textContent = msg;
}

function setPassError(msg) {
  passError.textContent = msg;
}

// Show/Hide password
togglePassBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  togglePassBtn.textContent = isHidden ? "hide" : "show";
});

// Optional: clear error habang nagta-type
usernameInput.addEventListener("input", () => {
  userError.textContent = "";
});

passwordInput.addEventListener("input", () => {
  passError.textContent = "";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearErrors();

  const u = usernameInput.value.trim();
  const p = passwordInput.value; // keep exact (case-sensitive)

  let ok = true;

  // Validate username
  if (u !== FIXED_USERNAME) {
    setUserError("Your Username is Incorrect");
    ok = false;
  }

  // Validate password
  if (p !== FIXED_PASSWORD) {
    setPassError("Your Password is Incorrect");
    ok = false;
  }

  // If both correct -> redirect
  if (ok) {
    window.location.href = "dashboard.html";
  }
});
