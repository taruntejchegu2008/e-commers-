// ===== Checkout: delivery details + payment method + order placement =====

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('checkout-cart')) return;

  // Protected page
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  const cart = getCart();
  if (cart.length === 0) {
    document.getElementById('message').textContent = 'Your cart is empty.';
    document.getElementById('message').className = 'message error';
    document.querySelector('.checkout-layout') && (document.querySelector('.checkout-layout').style.display = 'none');
    document.getElementById('checkout-cart').innerHTML = `<div class="cart-empty"><p>Your cart is empty.</p><p><a href="index.html">Browse products</a> to get started.</p></div>`;
    return;
  }

  renderSummary(cart);
  prefillUser();
  initPaymentToggling();
  bindPlaceOrder(cart);
});

function renderSummary(cart) {
  const container = document.getElementById('summary-items');
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  container.innerHTML = cart
    .map(
      (i) => `
      <div class="summary-item">
        <span>${i.name} <small>× ${i.quantity}</small></span>
        <span>${formatCurrency(i.price * i.quantity)}</span>
      </div>`
    )
    .join('');
  document.getElementById('summary-total').textContent = formatCurrency(total);
}

// Pre-fill name from the logged-in user if available
function prefillUser() {
  const user = getUser();
  if (user && user.name) {
    const f = document.getElementById('fullName');
    if (f && !f.value) f.value = user.name;
  }
}

// Toggle card/UPI fields based on selected payment method
function initPaymentToggling() {
  const radios = document.querySelectorAll('input[name="payment"]');
  const cardFields = document.getElementById('card-fields');
  const upiFields = document.getElementById('upi-fields');

  function update() {
    const method = document.querySelector('input[name="payment"]:checked').value;
    cardFields.classList.toggle('d-none', method !== 'card');
    upiFields.classList.toggle('d-none', method !== 'upi');
  }

  radios.forEach((r) => r.addEventListener('change', update));
  update();
}

function bindPlaceOrder(cart) {
  const btn = document.getElementById('place-order-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => placeOrder(cart, btn));
}

async function placeOrder(cart, btn) {
  const msg = document.getElementById('message');
  const show = (text, type = 'error') => {
    msg.textContent = text;
    msg.className = `message ${type}`;
  };

  const shipping = {
    fullName: document.getElementById('fullName').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    address: document.getElementById('address').value.trim(),
    city: document.getElementById('city').value.trim(),
    state: document.getElementById('state').value.trim(),
    pincode: document.getElementById('pincode').value.trim(),
  };

  // ---- Validate shipping ----
  if (Object.values(shipping).some((v) => !v)) {
    return show('Please fill in all delivery details.');
  }
  if (!/^\d{10}$/.test(shipping.phone)) {
    return show('Phone number must be 10 digits.');
  }
  if (!/^\d{6}$/.test(shipping.pincode)) {
    return show('PIN code must be 6 digits.');
  }

  // ---- Validate payment ----
  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
  const paymentDetails = {};

  if (paymentMethod === 'card') {
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s+/g, '');
    const cardName = document.getElementById('cardName').value.trim();
    const expiry = document.getElementById('cardExpiry').value.trim();
    const cvv = document.getElementById('cardCvv').value.trim();

    if (!cardName || !/^\d{13,16}$/.test(cardNumber) || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) || !/^\d{3,4}$/.test(cvv)) {
      return show('Please enter valid card details (number, expiry MM/YY, CVV).');
    }
    paymentDetails.last4 = cardNumber.slice(-4);
    paymentDetails.provider = 'Card';
  } else if (paymentMethod === 'upi') {
    const upiId = document.getElementById('upiId').value.trim();
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) {
      return show('Enter a valid UPI ID (e.g. yourname@okbank).');
    }
    paymentDetails.upiId = upiId;
  }

  // ---- Submit ----
  btn.disabled = true;
  btn.textContent = 'Placing order...';
  try {
    const res = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        products: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shipping,
        paymentMethod,
        paymentDetails,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      btn.disabled = false;
      btn.textContent = 'Place Order';
      return show(data.message || 'Checkout failed');
    }

    // Success — clear cart and go to orders
    localStorage.removeItem('cart');
    updateCartCount();
    show('Order placed successfully! Redirecting to your orders...', 'success');
    setTimeout(() => {
      window.location.href = 'orders.html';
    }, 900);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Place Order';
    show('Network error. Is the server running?');
  }
}