import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Auth Modal Elements
const authModal = document.getElementById("auth-modal");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authTitle = document.getElementById("auth-title");
const authToggle = document.getElementById("auth-toggle");
const authMessage = document.getElementById("auth-message");
const logoutBtn = document.getElementById("logout-btn");

// Form Inputs
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const registerUsername = document.getElementById("register-username");
const registerEmail = document.getElementById("register-email");
const registerPassword = document.getElementById("register-password");

let isLoginMode = true;

// Check if user is already logged in
export function initAuth() {
  const token = localStorage.getItem("token");
  if (token) {
    hideAuthModal();
    showLogoutBtn();
  } else {
    showAuthModal();
    hideLogoutBtn();
  }
}

// Show/Hide Auth Modal
function showAuthModal() {
  if (authModal) authModal.classList.remove("hidden");
}

function hideAuthModal() {
  if (authModal) authModal.classList.add("hidden");
}

function showLogoutBtn() {
  if (logoutBtn) logoutBtn.classList.remove("hidden");
}

function hideLogoutBtn() {
  if (logoutBtn) logoutBtn.classList.add("hidden");
}

// Switch between Login and Register
function switchToRegister() {
  isLoginMode = false;
  if (authTitle) authTitle.textContent = "Registreren";
  if (loginForm) loginForm.classList.add("hidden");
  if (registerForm) registerForm.classList.remove("hidden");
  if (authToggle) authToggle.innerHTML = 'Heb je al een account? <a href="#login">Log hier in</a>';
  if (authMessage) {
    authMessage.textContent = "";
    authMessage.classList.remove("error", "success");
  }
}

function switchToLogin() {
  isLoginMode = true;
  if (authTitle) authTitle.textContent = "Inloggen";
  if (registerForm) registerForm.classList.add("hidden");
  if (loginForm) loginForm.classList.remove("hidden");
  if (authToggle) authToggle.innerHTML = "Heb je nog geen account? <a href=\"#register\">Registreer hier</a>";
  if (authMessage) {
    authMessage.textContent = "";
    authMessage.classList.remove("error", "success");
  }
}

// Show Message
function showMessage(text, isError = false) {
  if (!authMessage) return;
  authMessage.textContent = text;
  authMessage.classList.remove("error", "success");
  authMessage.classList.add(isError ? "error" : "success");
}

// Login Handler
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();

  if (!email || !password) {
    showMessage("Vul alle velden in", true);
    return;
  }

  try {
    const res = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });

    const token = res.data.token;
    localStorage.setItem("token", token);
    showMessage("Inloggen geslaagd!", false);

    // Clear form
    loginEmail.value = "";
    loginPassword.value = "";

    // Hide modal and show configurator
    setTimeout(() => {
      hideAuthModal();
      showLogoutBtn();
    }, 500);
  } catch (err) {
    const errorMsg = err.response?.data?.message || "Inloggen mislukt. Probeer het opnieuw.";
    showMessage(errorMsg, true);
    console.error("Inlogfout:", err);
  }
});
}

// Register Handler
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = registerUsername.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value.trim();

  if (!username || !email || !password) {
    showMessage("Vul alle velden in", true);
    return;
  }

  if (password.length < 5) {
    showMessage("Wachtwoord moet minimaal 5 tekens bevatten", true);
    return;
  }

  try {
    const res = await axios.post(`${API_BASE_URL}/auth/register`, {
      username,
      email,
      password
    });

    const token = res.data.token;
    localStorage.setItem("token", token);
    showMessage("Registratie succesvol!", false);

    // Clear form
    registerUsername.value = "";
    registerEmail.value = "";
    registerPassword.value = "";

    // Hide modal and show configurator
    setTimeout(() => {
      hideAuthModal();
      showLogoutBtn();
    }, 500);
  } catch (err) {
    console.error("Registratie error volledige response:", err.response);
    console.error("Registratie error data:", err.response?.data);
    const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Registratie mislukt. Probeer het opnieuw.";
    showMessage(errorMsg, true);
  }
});
}

// Toggle between Login and Register
if (authToggle) {
  authToggle.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    e.preventDefault();
    const href = e.target.getAttribute("href");
    if (href === "#register") {
      switchToRegister();
    } else if (href === "#login") {
      switchToLogin();
    }
  }
});
}

// Logout Handler
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  showAuthModal();
  hideLogoutBtn();
  switchToLogin();
});
}

// Get current token
export function getToken() {
  return localStorage.getItem("token");
}

// Check if user is authenticated
export function isAuthenticated() {
  return !!localStorage.getItem("token");
}
