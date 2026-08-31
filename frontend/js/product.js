// ===== Product Listing & Detail Logic =====

// Fetch all products (optionally filtered by search)
async function fetchProducts(search = '') {
  const url = search
    ? `${API_URL}/products?search=${encodeURIComponent(search)}`
    : `${API_URL}/products`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch products');
  }
  return res.json();
}

// Render a grid of product cards
function renderProductGrid(products, container) {
  container.innerHTML = '';

  if (products.length === 0) {
    container.innerHTML = '<p class="cart-empty">No products found. Try a different search.</p>';
    return;
  }

  products.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const outOfStock = p.stock <= 0;

    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}" />
      <div class="product-info">
        <h3>${p.name}</h3>
        <p>${p.description.length > 80 ? p.description.slice(0, 80) + '...' : p.description}</p>
        <div class="price">${formatCurrency(p.price)}</div>
        <div class="card-actions">
          <a href="product.html?id=${p._id}" class="btn btn-outline">View Details</a>
          <button class="btn btn-primary add-to-cart" data-id="${p._id}"
            ${outOfStock ? 'disabled' : ''}>
            ${outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // Attach add-to-cart handlers
  container.querySelectorAll('.add-to-cart').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const product = products.find((p) => p._id === id);
      addToCart(product);
    });
  });
}

// --- Product Listing Page ---
async function initProductsPage() {
  const grid = document.getElementById('products-grid');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');

  async function load(search = '') {
    grid.innerHTML = '<p class="loading">Loading products...</p>';
    try {
      const products = await fetchProducts(search);
      renderProductGrid(products, grid);
    } catch (err) {
      grid.innerHTML = `<p class="cart-empty">${err.message}</p>`;
    }
  }

  // Initial load
  load();

  // Search triggers
  if (searchBtn && searchInput) {
    const doSearch = () => load(searchInput.value.trim());
    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') doSearch();
    });
  }
}

// --- Product Detail Page ---
async function initProductDetailPage() {
  const container = document.getElementById('product-detail');
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  if (!id) {
    container.innerHTML = '<p class="cart-empty">Invalid product ID.</p>';
    return;
  }

  container.innerHTML = '<p class="loading">Loading product...</p>';

  try {
    const res = await fetch(`${API_URL}/products/${id}`);
    if (!res.ok) {
      throw new Error('Product not found');
    }
    const p = await res.json();
    const outOfStock = p.stock <= 0;

    container.innerHTML = `
      <img src="${p.image}" alt="${p.name}" />
      <div class="detail-info">
        <h1>${p.name}</h1>
        <p class="description">${p.description}</p>
        <div class="price">${formatCurrency(p.price)}</div>
        <p class="${outOfStock ? 'stock-low' : 'stock-available'}">
          ${outOfStock ? 'Out of Stock' : `In Stock: ${p.stock} available`}
        </p>
        <button class="btn btn-primary add-to-cart" data-id="${p._id}"
          ${outOfStock ? 'disabled' : ''}>
          ${outOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    `;

    container.querySelector('.add-to-cart')?.addEventListener('click', () => addToCart(p));
  } catch (err) {
    container.innerHTML = `<p class="cart-empty">${err.message}</p>`;
  }
}

// --- Route to correct page initializer ---
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('products-grid')) initProductsPage();
  if (document.getElementById('product-detail')) initProductDetailPage();
});
