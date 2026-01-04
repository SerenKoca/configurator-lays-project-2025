import axios from "axios";

const API_BASE_URL = "https://api-lays-project-2025.onrender.com";

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
  authModal.classList.remove("hidden");
}

function hideAuthModal() {
  authModal.classList.add("hidden");
}

function showLogoutBtn() {
  logoutBtn.classList.remove("hidden");
}

function hideLogoutBtn() {
  logoutBtn.classList.add("hidden");
}

// Switch between Login and Register
function switchToRegister() {
  isLoginMode = false;
  authTitle.textContent = "Register";
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  authToggle.innerHTML = 'Already have an account? <a href="#login">Login here</a>';
  authMessage.textContent = "";
  authMessage.classList.remove("error", "success");
}

function switchToLogin() {
  isLoginMode = true;
  authTitle.textContent = "Login";
  registerForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  authToggle.innerHTML = "Don't have an account? <a href=\"#register\">Register here</a>";
  authMessage.textContent = "";
  authMessage.classList.remove("error", "success");
}

// Show Message
function showMessage(text, isError = false) {
  authMessage.textContent = text;
  authMessage.classList.remove("error", "success");
  authMessage.classList.add(isError ? "error" : "success");
}

// Login Handler
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();

  if (!email || !password) {
    showMessage("Please fill in all fields", true);
    return;
  }

  try {
    const res = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });

    const token = res.data.token;
    localStorage.setItem("token", token);
    showMessage("Login successful!", false);

    // Clear form
    loginEmail.value = "";
    loginPassword.value = "";

    // Hide modal and show configurator
    setTimeout(() => {
      hideAuthModal();
      showLogoutBtn();
    }, 500);
  } catch (err) {
    const errorMsg = err.response?.data?.message || "Login failed. Please try again.";
    showMessage(errorMsg, true);
    console.error("Login error:", err);
  }
});

// Register Handler
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = registerUsername.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value.trim();

  if (!username || !email || !password) {
    showMessage("Please fill in all fields", true);
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters", true);
    return;
  }

  try {
    console.log("Attempting to register with:", { username, email });
    const res = await axios.post(`${API_BASE_URL}/auth/register`, {
      username,
      email,
      password
    });

    console.log("Register response:", res.data);
    const token = res.data.token;
    localStorage.setItem("token", token);
    showMessage("Registration successful!", false);

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
    console.error("Register error full response:", err.response);
    console.error("Register error data:", err.response?.data);
    const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Registration failed. Please try again.";
    showMessage(errorMsg, true);
  }
});

// Toggle between Login and Register
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

// Logout Handler
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  showAuthModal();
  hideLogoutBtn();
  switchToLogin();
});

// Get current token
export function getToken() {
  return localStorage.getItem("token");
}

// Check if user is authenticated
export function isAuthenticated() {
  return !!localStorage.getItem("token");
}
