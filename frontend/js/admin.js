// ===== ShopEasy Admin Panel Logic =====

let editingId = null;

// Decode the JWT to read the embedded isAdmin flag (fallback to stored user)
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function currentUserIsAdmin() {
  const token = getToken();
  const decoded = token ? decodeJwt(token) : null;
  const stored = getUser();
  return !!(decoded && decoded.isAdmin) || !!(stored && stored.isAdmin);
}

// Fetch all products for the admin table
async function fetchAllProducts() {
  const res = await fetch(`${API_URL}/products`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

// Render the products table
function renderProductsTable(products, body) {
  body.innerHTML = '';

  if (products.length === 0) {
    body.innerHTML = '<tr><td colspan="5" class="cart-empty">No products yet.</td></tr>';
    return;
  }

  products.forEach((p) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img class="admin-thumb" src="${p.image}" alt="${p.name}"></td>
      <td>${p.name}</td>
      <td>${formatCurrency(p.price)}</td>
      <td>${p.stock}</td>
      <td class="actions-cell">
        <button class="btn btn-small btn-outline edit-btn" data-id="${p._id}">Edit</button>
        <button class="btn btn-small btn-danger delete-btn" data-id="${p._id}">Delete</button>
      </td>
    `;
    body.appendChild(row);
  });

  // Bind edit/delete handlers
  body.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const product = products.find((p) => p._id === id);
      if (product) startEdit(product);
    });
  });

  body.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
}

// Load products into the table
async function loadProducts() {
  const body = document.getElementById('products-body');
  body.innerHTML = '<tr><td colspan="5" class="loading">Loading products...</td></tr>';
  try {
    const products = await fetchAllProducts();
    renderProductsTable(products, body);
  } catch (err) {
    body.innerHTML = `<tr><td colspan="5" class="cart-empty">${err.message}</td></tr>`;
  }
}

// Fill the form for editing
function startEdit(product) {
  editingId = product._id;
  document.getElementById('product-id').value = product._id;
  document.getElementById('name').value = product.name;
  document.getElementById('description').value = product.description;
  document.getElementById('price').value = product.price;
  document.getElementById('stock').value = product.stock;
  document.getElementById('image').value = product.image || '';
  document.getElementById('form-title').textContent = 'Edit Product';
  document.getElementById('cancel-btn').classList.remove('d-none');
  document.getElementById('save-btn').textContent = 'Update Product';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Reset the form to "add" mode
function resetForm() {
  editingId = null;
  document.getElementById('product-form').reset();
  document.getElementById('product-id').value = '';
  document.getElementById('form-title').textContent = 'Add New Product';
  document.getElementById('save-btn').textContent = 'Save Product';
  document.getElementById('cancel-btn').classList.add('d-none');
}

// Handle form submit (create or update)
async function handleSubmit(e) {
  e.preventDefault();
  if (!currentUserIsAdmin()) {
    showMessage('You must be an admin to manage products.', 'error');
    return;
  }

  const payload = {
    name: document.getElementById('name').value.trim(),
    description: document.getElementById('description').value.trim(),
    price: Number(document.getElementById('price').value),
    stock: Number(document.getElementById('stock').value),
    image: document.getElementById('image').value.trim() || 'https://via.placeholder.com/300x300?text=No+Image',
  };

  if (!payload.name || !payload.description || isNaN(payload.price) || isNaN(payload.stock)) {
    showMessage('Please fill in all required fields.', 'error');
    return;
  }
  if (payload.price < 0 || payload.stock < 0) {
    showMessage('Price and stock must be non-negative.', 'error');
    return;
  }

  const method = editingId ? 'PUT' : 'POST';
  const url = editingId ? `${API_URL}/products/${editingId}` : `${API_URL}/products`;

  try {
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      showMessage(data.message || 'Failed to save product', 'error');
      return;
    }

    showMessage(editingId ? 'Product updated successfully.' : 'Product created successfully.', 'success');
    resetForm();
    loadProducts();
  } catch (err) {
    showMessage('Network error. Is the server running?', 'error');
  }
}

// Delete a product
async function deleteProduct(id) {
  if (!currentUserIsAdmin()) {
    showMessage('You must be an admin to manage products.', 'error');
    return;
  }
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      showMessage(data.message || 'Failed to delete product', 'error');
      return;
    }

    showMessage('Product deleted successfully.', 'success');
    if (editingId === id) resetForm();
    loadProducts();
  } catch (err) {
    showMessage('Network error. Is the server running?', 'error');
  }
}

// --- Initialize the admin page ---
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  if (!currentUserIsAdmin()) {
    showMessage('Access denied. Admin privileges required.', 'error');
    return;
  }

  initAdminPage();
});

function initAdminPage() {
  const form = document.getElementById('product-form');
  const cancelBtn = document.getElementById('cancel-btn');

  if (form) form.addEventListener('submit', handleSubmit);
  if (cancelBtn) cancelBtn.addEventListener('click', resetForm);

  loadProducts();
}
