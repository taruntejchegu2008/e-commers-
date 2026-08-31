# 🛍️ ShopEasy — Full-Stack E-Commerce Store

A simple full-stack e-commerce web application built with vanilla JavaScript (frontend), Node.js + Express (backend), and MongoDB. Users can register, log in, browse products, manage a cart, place orders, and view their order history.

## Tech Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript (no framework)
- **Backend:** Node.js + Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Auth:** JWT + bcrypt (password hashing)
- **API testing:** Postman-compatible REST endpoints

## Folder Structure

```
ecommerce-store/
├── frontend/
│   ├── index.html        (product listing + search)
│   ├── login.html
│   ├── register.html
│   ├── product.html      (product detail)
│   ├── cart.html
│   ├── orders.html       (order history)
│   ├── css/style.css
│   └── js/
│       ├── auth.js       (login/register, token & navbar helpers)
│       ├── product.js    (listing/detail + search)
│       ├── cart.js       (localStorage cart + checkout)
│       └── order.js      (order history)
├── backend/
│   ├── server.js
│   ├── seed.js           (sample data seeding script)
│   ├── models/  User.js, Product.js, Order.js
│   ├── routes/  authRoutes.js, productRoutes.js, orderRoutes.js
│   ├── middleware/authMiddleware.js
│   ├── .env.example
│   ├── .env
│   └── package.json
└── README.md
```

---

## Setup & Run Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) (v14+)
- [MongoDB](https://www.mongodb.com/) running locally (default: `mongodb://localhost:27017`) — or use MongoDB Atlas

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` (a `.env` is already provided for convenience):

```
# backend/.env
MONGO_URI=mongodb://localhost:27017/shopeasy
JWT_SECRET=shopeasy_super_secret_key_2026
PORT=5000
```

> **Important:** Change `JWT_SECRET` to a long random string in production.

### 3. Seed the Database with Sample Products

```bash
npm run seed
```

This inserts 6 sample products into MongoDB.

### 4. Start the Backend Server

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

The server runs at **http://localhost:5000** and serves both the API and the frontend static files.

### 5. Open the Frontend

Since `server.js` serves the `frontend/` folder, just open your browser at:

```
http://localhost:5000
```

You can also open any of the HTML files directly (e.g. double-click `frontend/login.html`), but the recommended approach is visiting the server root.

---

## Using the App

1. **Register** an account (`register.html`).
2. **Log in** — a JWT is stored in `localStorage`.
3. **Browse products** and use the **search bar** to filter by name.
4. Click **View Details** for more info, or **Add to Cart**.
5. Go to **Cart**, adjust quantities, and click **Proceed to Checkout**.
6. View your **Orders** history.

---

## API Reference (Postman-compatible)

Base URL: `http://localhost:5000/api`

### Auth

| Method | Endpoint            | Body                                  | Description                 |
|--------|---------------------|---------------------------------------|-----------------------------|
| POST   | `/api/auth/register` | `{ name, email, password }`           | Creates user, hashes password, returns JWT |
| POST   | `/api/auth/login`    | `{ email, password }`                 | Returns JWT                |

### Products

| Method | Endpoint           | Query/Notes                        | Auth    |
|--------|--------------------|------------------------------------|---------|
| GET    | `/api/products`    | optional `?search=term`            | Public  |
| GET    | `/api/products/:id`| `:id` = MongoDB product ID        | Public  |
| POST   | `/api/products`    | `{ name, description, price, stock, image }` | JWT (admin-protected) |

### Orders (JWT-protected — send `Authorization: Bearer <token>`)

| Method | Endpoint       | Body                                                              | Description                       |
|--------|----------------|-------------------------------------------------------------------|-----------------------------------|
| POST   | `/api/orders`  | `{ products: [{ productId, quantity }] }`                         | Creates order, deducts stock      |
| GET    | `/api/orders`  | —                                                                 | Returns logged-in user's orders   |

**Example login request (Postman):**

```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Example create order:**

```
POST http://localhost:5000/api/orders
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "products": [
    { "productId": "<product_id>", "quantity": 2 }
  ]
}
```

---

## Sample .env Values

```
MONGO_URI=mongodb://localhost:27017/shopeasy
JWT_SECRET=change_this_to_a_long_random_string_in_production
PORT=5000
```

---

## Code Notes (non-obvious logic)

- **Password hashing:** Done automatically in the `User` model's `pre('save')` Mongoose hook — never store plaintext passwords.
- **JWT:** Signed with the user's `_id` as payload and a 7-day expiry. The `authMiddleware.js` **protect** function verifies the token and attaches `req.user` (password excluded) for protected routes.
- **Stock deduction:** The order route validates stock and decrements it per item inside a loop before saving the order, preventing overselling.
- **Cart is client-side:** Stored in `localStorage` so users don't need an account to add items; accounts are only required at checkout and for viewing orders.
- **Search:** Backend filters products with a case-insensitive regex on the `name` field based on the `?search=` query param.
- **Order number:** Uses the last 8 characters of the MongoDB `_id` (uppercased) as a human-friendly order reference. A dedicated numeric counter can replace this in future versions.

---

## Future Work (Out of Scope for This Version)

- 💳 Razorpay / payment gateway integration
- 📊 Admin dashboard (product & order management)
- ⭐ Product reviews & ratings
- ❤️ Wishlist
- 📧 Email notifications (order confirmations)
- 🏷️ Coupons & discount codes
- 🗂️ Product categories

---

## License

Free to use for learning and personal projects.
