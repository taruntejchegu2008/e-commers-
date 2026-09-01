// ===== Cart Logic (stored in localStorage) ====

// --- Cart storage helpers ---
const getCart = () => JSON.parse(localStorage.getItem('cart') || '[]');
const saveCart = (cart) => {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
};

// Add a product to the cart (or increment quantity if already present)
function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((item) => item.productId === product._id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      productId: product._id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
      stock: product.stock,
    });
  }

  saveCart(cart);
  alert(`${product.name} added to cart!`);
}

function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.productId !== productId);
  saveCart(cart);
  renderCartPage(); // re-render if on cart page
}

function updateQuantity(productId, newQty) {
  const cart = getCart();
  const item = cart.find((i) => i.productId === productId);
  if (!item) return;

  if (newQty < 1) {
    // Remove if quantity drops below 1
    removeFromCart(productId);
    return;
  }

  // Respect stock limit
  if (item.stock !== undefined && newQty > item.stock) {
    alert(`Only ${item.stock} available in stock.`);
    newQty = item.stock;
  }

  item.quantity = newQty;
  saveCart(cart);
  renderCartPage();
}

// --- Cart Page Rendering ---
function renderCartPage() {
  const container = document.getElementById('cart-container');
  if (!container) return;

  const cart = getCart();

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <p>Your cart is empty.</p>
        <p><a href="index.html">Browse products</a> to get started.</p>
      </div>
    `;
    return;
  }

  let total = 0;

  const itemsHtml = cart
    .map((item) => {
      const lineTotal = item.price * item.quantity;
      total += lineTotal;
      return `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" />
          <div class="item-name">
            <h4>${item.name}</h4>
            <div class="price">${formatCurrency(item.price)}</div>
          </div>
          <div class="item-controls">
            <button class="qty-btn" data-action="decrement" data-id="${item.productId}">−</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" data-action="increment" data-id="${item.productId}">+</button>
            <button class="btn btn-danger" data-action="remove" data-id="${item.productId}">Remove</button>
          </div>
          <div class="price">${formatCurrency(lineTotal)}</div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `
    ${itemsHtml}
    <div class="cart-footer">
      <div>
        <h3>Total: <span class="price">${formatCurrency(total)}</span></h3>
      </div>
      <button id="checkout-btn" class="btn btn-primary">Proceed to Checkout</button>
    </div>
  `;

  // Delegate all cart item actions (increment/decrement/remove) so they
  // work without inline handlers (which helmet CSP blocks).
  container.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const { action, id } = btn.dataset;
      if (action === 'increment') {
        const item = getCart().find((i) => i.productId === id);
        updateQuantity(id, (item ? item.quantity : 0) + 1);
      } else if (action === 'decrement') {
        const item = getCart().find((i) => i.productId === id);
        updateQuantity(id, (item ? item.quantity : 0) - 1);
      } else if (action === 'remove') {
        removeFromCart(id);
      }
    });
  });

  document.getElementById('checkout-btn').addEventListener('click', () => {
    window.location.href = 'checkout.html';
  });
}

// --- Initialise cart page on load ---
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('cart-container')) return;

  // Redirect to login if no valid token is present (protected page)
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  renderCartPage();
});
