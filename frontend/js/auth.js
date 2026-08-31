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

// --- Update navbar UI based on auth state ---
function updateNavbar() {
  const user = getUser();
  const navUser = document.getElementById('nav-user');
  const logoutBtn = document.getElementById('logout-btn');
  const loginLink = document.getElementById('login-link');

  if (user) {
    if (navUser) navUser.textContent = `Hi, ${user.name}`;
    if (logoutBtn) logoutBtn.classList.remove('d-none');
    if (loginLink) loginLink.classList.add('d-none');
  } else {
    if (navUser) navUser.textContent = '';
    if (logoutBtn) logoutBtn.classList.add('d-none');
    if (loginLink) loginLink.classList.remove('d-none');
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
        localStorage.setItem('user', JSON.stringify({ _id: data._id, name: data.name, email: data.email }));
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

      if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
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
        localStorage.setItem('user', JSON.stringify({ _id: data._id, name: data.name, email: data.email }));
        window.location.href = 'index.html';
      } catch (err) {
        showMessage('Network error. Is the server running?', 'error');
      }
    });
  }
});
