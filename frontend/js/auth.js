// ===== ShopEasy Auth & Shared Helpers =====
const API_URL = 'http://localhost:5000/api';

// --- Token helpers ---
const getToken = () => localStorage.getItem('token');
const getUser = () => {
  const data = localStorage.getItem('user');
  return data ? JSON.parse(data) : null;
};
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

// Check if user is logged in (has a token)
const isAuthenticated = () => !!getToken();

// --- Navigation helper: redirect to login if not authenticated ---
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// --- Decode the JWT to read the embedded isAdmin flag ---
function decodeJwt(token) {
  try {
    // JWT uses base64url (no padding). Convert to standard base64:
    //   - swap base64url chars (- _) for standard (+ /)
    //   - restore '=' padding so atob() works on all inputs
    let base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';

    // Decode bytes then interpret as UTF-8 JSON
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const jsonPayload = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Check whether the currently logged-in user is an admin
const isAdmin = () => {
  const token = getToken();
  const decoded = token ? decodeJwt(token) : null;
  const user = getUser();
  return !!(decoded && decoded.isAdmin) || !!(user && user.isAdmin);
};

// --- Update navbar UI based on auth state ---
function updateNavbar() {
  const user = getUser();
  const navUser = document.getElementById('nav-user');
  const logoutBtn = document.getElementById('logout-btn');
  const loginLink = document.getElementById('login-link');
  const adminLink = document.getElementById('admin-link');

  if (user) {
    if (navUser) navUser.textContent = `Hi, ${user.name}`;
    if (logoutBtn) logoutBtn.classList.remove('d-none');
    if (loginLink) loginLink.classList.add('d-none');
    if (adminLink) {
      if (isAdmin()) {
        adminLink.classList.remove('d-none');
      } else {
        adminLink.classList.add('d-none');
      }
    }
  } else {
    if (navUser) navUser.textContent = '';
    if (logoutBtn) logoutBtn.classList.add('d-none');
    if (loginLink) loginLink.classList.remove('d-none');
    if (adminLink) adminLink.classList.add('d-none');
  }

  updateCartCount();
}

// --- Update cart badge count in navbar ---
function updateCartCount() {
  const badge = document.getElementById('cart-count');
  if (badge) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const count = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    badge.textContent = count;
  }
}

// --- Logout ---
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// --- Show message helper ---
function showMessage(text, type = 'error') {
  const msg = document.getElementById('message');
  if (!msg) return;
  msg.textContent = text;
  msg.className = `message ${type}`;
}

// --- Format currency ---
const formatCurrency = (amount) => `$${Number(amount).toFixed(2)}`;

// --- Client-side validation helpers ---
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (email) => EMAIL_REGEX.test(email);

// --- Initialize on every page ---
document.addEventListener('DOMContentLoaded', () => {
  // Logout button handler
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  updateNavbar();

  // --- Login form handler ---
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      // Client-side validation: required fields + email format
      if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
      }
      if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
      }

      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          showMessage(data.message || 'Login failed', 'error');
          return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({ _id: data._id, name: data.name, email: data.email, isAdmin: data.isAdmin }));
        window.location.href = 'index.html';
      } catch (err) {
        showMessage('Network error. Is the server running?', 'error');
      }
    });
  }

  // --- Register form handler ---
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      // Client-side validation: required fields, email format, password length
      if (!name || !email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
      }
      if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
      }
      // Mirror the server-side password policy on the client for fast feedback
      const pwdErrors = [];
      if (password.length < 8) pwdErrors.push('at least 8 characters');
      if (!/[A-Z]/.test(password)) pwdErrors.push('an uppercase letter');
      if (!/[a-z]/.test(password)) pwdErrors.push('a lowercase letter');
      if (!/\d/.test(password)) pwdErrors.push('a number');
      if (!/[^A-Za-z0-9]/.test(password)) pwdErrors.push('a special character');
      if (pwdErrors.length > 0) {
        showMessage(`Password must contain ${pwdErrors.join(', ')}`, 'error');
        return;
      }

      try {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          showMessage(data.message || 'Registration failed', 'error');
          return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({ _id: data._id, name: data.name, email: data.email, isAdmin: data.isAdmin }));
        window.location.href = 'index.html';
      } catch (err) {
        showMessage('Network error. Is the server running?', 'error');
      }
    });
  }
});
