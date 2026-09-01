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
  const fileInput = document.getElementById('image-file');
  if (fileInput) fileInput.value = '';
}

// Upload a file to Supabase Storage, returns the public URL
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Upload failed');
  }
  return data.url;
}

// Handle form submit (create or update)
async function handleSubmit(e) {
  e.preventDefault();
  if (!currentUserIsAdmin()) {
    showMessage('You must be an admin to manage products.', 'error');
    return;
  }

  const saveBtn = document.getElementById('save-btn');
  const fileInput = document.getElementById('image-file');
  let image = document.getElementById('image').value.trim();

  // If a file was picked, upload it to Supabase and use the returned URL.
  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    try {
      showMessage('Uploading image...', 'info');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Uploading...'; }
      image = await uploadImage(fileInput.files[0]);
    } catch (err) {
      showMessage(err.message, 'error');
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = editingId ? 'Update Product' : 'Save Product'; }
      return;
    }
  }

  image = image || 'https://via.placeholder.com/300x300?text=No+Image';

  const payload = {
    name: document.getElementById('name').value.trim(),
    description: document.getElementById('description').value.trim(),
    price: Number(document.getElementById('price').value),
    stock: Number(document.getElementById('stock').value),
    image,
  };

  if (!payload.name || !payload.description || isNaN(payload.price) || isNaN(payload.stock)) {
    showMessage('Please fill in all required fields.', 'error');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = editingId ? 'Update Product' : 'Save Product'; }
    return;
  }
  if (payload.price < 0 || payload.stock < 0) {
    showMessage('Price and stock must be non-negative.', 'error');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = editingId ? 'Update Product' : 'Save Product'; }
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
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = editingId ? 'Update Product' : 'Save Product'; }
      return;
    }

    showMessage(editingId ? 'Product updated successfully.' : 'Product created successfully.', 'success');
    resetForm();
    loadProducts();
  } catch (err) {
    showMessage('Network error. Is the server running?', 'error');
  } finally {
    if (fileInput) fileInput.value = '';
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = editingId ? 'Update Product' : 'Save Product'; }
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

// ===== Order Management =====

const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

// Fetch all orders (admin-only endpoint)
async function fetchAllOrders() {
  const res = await fetch(`${API_URL}/orders/all`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

// Build a readable list of line items for an order
function orderItemsText(order) {
  const snapshot = order.itemsSnapshot && order.itemsSnapshot.length ? order.itemsSnapshot : [];
  const lines = snapshot.map((s) => `${s.name} × ${s.quantity}`);

  if (lines.length === 0 && order.products) {
    order.products.forEach((p) => {
      const name = p.productId && typeof p.productId === 'object' && p.productId.name
        ? p.productId.name
        : 'Product no longer available';
      lines.push(`${name} × ${p.quantity}`);
    });
  }
  return lines.join('<br>') || '—';
}

function orderStatusClass(status) {
  const s = (status || 'Pending').toLowerCase();
  if (['delivered', 'processing'].includes(s)) return 'status-ok';
  if (s === 'cancelled') return 'status-cancel';
  if (s === 'shipped') return 'status-info';
  return 'status-pending';
}

// Render the orders table
function renderOrdersTable(orders, body) {
  body.innerHTML = '';

  if (orders.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="cart-empty">No orders yet.</td></tr>';
    return;
  }

  orders.forEach((order) => {
    const customer = order.userId && order.userId.name ? order.userId.name : 'Unknown';
    const orderNumber = order._id.slice(-8).toUpperCase();
    const date = new Date(order.createdAt).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const options = ORDER_STATUSES.map(
      (s) => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`
    ).join('');

    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="order-number" style="white-space:nowrap">#${orderNumber}</td>
      <td>${customer}</td>
      <td>${orderItemsText(order)}</td>
      <td>${formatCurrency(order.totalAmount)}</td>
      <td style="white-space:nowrap">${date}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <span class="order-status ${orderStatusClass(order.status)}">${order.status}</span>
          <select class="status-select" data-id="${order._id}">
            ${options}
          </select>
        </div>
      </td>
    `;
    body.appendChild(row);
  });

  // Bind status change handlers
  body.querySelectorAll('.status-select').forEach((sel) => {
    sel.addEventListener('change', () => updateOrderStatus(sel.dataset.id, sel.value));
  });
}

// Update an order's status via the admin endpoint
async function updateOrderStatus(orderId, status) {
  try {
    const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    if (!res.ok) {
      showMessage(data.message || 'Failed to update order status', 'error');
      loadOrders(); // revert the dropdown
      return;
    }

    showMessage(`Order #${orderId.slice(-8).toUpperCase()} marked as ${status}.`, 'success');
    loadOrders();
  } catch (err) {
    showMessage('Network error. Is the server running?', 'error');
    loadOrders();
  }
}

// Load all orders into the table
async function loadOrders() {
  const body = document.getElementById('orders-body');
  body.innerHTML = '<tr><td colspan="6" class="loading">Loading orders...</td></tr>';
  try {
    const orders = await fetchAllOrders();
    renderOrdersTable(orders, body);
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6" class="cart-empty">${err.message}</td></tr>`;
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
  loadOrders();
}
