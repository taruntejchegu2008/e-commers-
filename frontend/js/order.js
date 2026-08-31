// ===== Order History Logic =====

// Fetch the logged-in user's orders
async function fetchOrders() {
  const res = await fetch(`${API_URL}/orders`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch orders');
  }
  return res.json();
}

// Format an ISO date string into a readable format
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Render the orders page
async function initOrdersPage() {
  const container = document.getElementById('orders-container');
  if (!container) return;

  // Require auth first
  if (!requireAuth()) return;

  container.innerHTML = '<p class="loading">Loading orders...</p>';

  try {
    const orders = await fetchOrders();

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <p>You have no orders yet.</p>
          <p><a href="index.html">Browse products</a> and place your first order.</p>
        </div>
      `;
      return;
    }

    const ordersHtml = orders
      .map((order) => {
        const itemsHtml = order.products
          .map((p) => {
            // If the product was deleted from the catalog, productId stays an
            // unpopulated ObjectId (no .name/.price). Show a graceful fallback.
            const productExists = p.productId && typeof p.productId === 'object' && p.productId.name;
            const name = productExists ? p.productId.name : 'Product no longer available';
            const price = productExists ? p.productId.price : 0;
            return `
              <div class="order-item">
                <span>${name} × ${p.quantity}</span>
                <span>${formatCurrency(price * p.quantity)}</span>
              </div>
            `;
          })
          .join('');

        // Use the MongoDB _id as the order number for this version.
        // A separate numeric order ID can be added later.
        const orderNumber = order._id.slice(-8).toUpperCase();

        return `
          <div class="order-card">
            <div class="order-header">
              <span class="order-number">Order #${orderNumber}</span>
              <span class="order-date">${formatDate(order.createdAt)}</span>
            </div>
            <div class="order-items">${itemsHtml}</div>
            <div class="order-total">Total: ${formatCurrency(order.totalAmount)}</div>
          </div>
        `;
      })
      .join('');

    container.innerHTML = ordersHtml;
  } catch (err) {
    if (err.message === 'Failed to fetch orders' && !isAuthenticated()) {
      window.location.href = 'login.html';
    } else {
      container.innerHTML = `<p class="cart-empty">${err.message}</p>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('orders-container')) initOrdersPage();
});
