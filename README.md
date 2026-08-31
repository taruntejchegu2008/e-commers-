<div align="center">

# ShopEasy

**A full-stack e-commerce store with user authentication, product browsing, cart management, and order history.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=black)
![Mongoose](https://img.shields.io/badge/Mongoose-8.x-880000?logo=mongoose)

</div>

---

## Overview

ShopEasy is a lightweight e-commerce web application built as a mini-project using the MERN stack (with vanilla JS instead of React). Users can register, log in, browse and search products, manage a shopping cart, place orders, and view their order history — all backed by a RESTful API with JWT authentication.

## Screenshots

> Add screenshots of your running application here.

<!-- 
Replace the placeholders below with actual screenshots:
1. Product listing page
2. Product detail page
3. Cart page
4. Order history page
5. Login / Register page
-->

| Product Listing | Product Detail | Cart | Order History |
|:---:|:---:|:---:|:---:|
| ![Product Listing](screenshots/products.png) | ![Product Detail](screenshots/product-detail.png) | ![Cart](screenshots/cart.png) | ![Orders](screenshots/orders.png) |

| Login | Register |
|:---:|:---:|
| ![Login](screenshots/login.png) | ![Register](screenshots/register.png) |

> **To add screenshots:** create a `screenshots/` folder in the project root, place your PNG/JPG files there, and update the paths above.

---

## Features

- **User Authentication** — register and log in with email/password; passwords are hashed with bcrypt; JWT-based session with 7-day expiry
- **Product Catalogue** — browse all products with image, name, price, and stock status; search bar for filtering by name
- **Product Detail View** — full description, pricing, stock availability, and add-to-cart action
- **Shopping Cart** — client-side cart stored in localStorage; add/remove items, adjust quantities with live total calculation; stock limits enforced
- **Order Placement** — checkout sends cart to the API, which validates stock, deducts inventory atomically, and creates a persisted order record
- **Order History** — view past orders with order number, date, line items, and total amount
- **Protected Routes** — cart and order pages redirect to login when unauthenticated; API endpoints reject requests without a valid JWT
- **Responsive Design** — mobile-friendly layout using CSS Grid and Flexbox, no external UI framework
- **Input Validation** — client-side email format and required-field checks; server-side validation on all API inputs
- **Error Handling** — centralized Express error middleware; frontend shows loading states and error messages

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (no framework) |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (via Mongoose ODM) |
| **Authentication** | JSON Web Tokens (JWT) + bcryptjs |
| **Dev Tools** | Nodemon, Postman |

---

## Folder Structure

```
ecommerce-store/
├── frontend/
│   ├── index.html              # Product listing + search
│   ├── login.html              # Login page
│   ├── register.html           # Registration page
│   ├── product.html            # Single product detail
│   ├── cart.html               # Shopping cart + checkout
│   ├── orders.html             # Order history
│   ├── css/
│   │   └── style.css           # All styles (responsive, CSS variables)
│   └── js/
│       ├── auth.js             # Auth helpers, navbar, form handlers
│       ├── product.js          # Product listing & detail logic
│       ├── cart.js             # Cart management + checkout
│       └── order.js            # Order history rendering
├── backend/
│   ├── server.js               # Express app, middleware, MongoDB connection
│   ├── seed.js                 # Database seeder (6 sample products)
│   ├── models/
│   │   ├── User.js             # User schema (bcrypt pre-save hook)
│   │   ├── Product.js          # Product schema
│   │   └── Order.js            # Order schema (ref User + Product)
│   ├── routes/
│   │   ├── authRoutes.js       # POST /register, POST /login
│   │   ├── productRoutes.js    # GET /, GET /:id, POST /
│   │   └── orderRoutes.js      # POST /, GET /  (JWT-protected)
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT verification middleware
│   ├── .env.example            # Environment variable template
│   ├── package.json
│   └── package-lock.json
├── postman/
│   └── ShopEasy.postman_collection.json  # Importable API test collection
└── README.md
```

---

## Getting Started

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| [Node.js](https://nodejs.org/) | v18 or higher | Runtime |
| [MongoDB](https://www.mongodb.com/) | 6+ (or Atlas) | Database |
| [npm](https://www.npmjs.com/) | v9+ (bundled with Node) | Package manager |

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/ecommerce-store.git
cd ecommerce-store
```

**2. Install backend dependencies**

```bash
cd backend
npm install
```

**3. Configure environment variables**

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
MONGO_URI=mongodb://localhost:27017/shopeasy
JWT_SECRET=your_super_secret_key_change_this
PORT=5000
```

> If using MongoDB Atlas, paste your Atlas connection string as the `MONGO_URI` value.

**4. Seed the database (optional but recommended)**

```bash
npm run seed
```

This inserts 6 realistic sample products into your database so the app has data to display immediately.

**5. Start the server**

```bash
# Production
npm start

# Development (auto-restart on file changes)
npm run dev
```

The server starts at **http://localhost:5000**.

**6. Open the frontend**

Navigate to **http://localhost:5000** in your browser. The Express server serves the `frontend/` directory automatically.

### Quick Start (copy-paste)

```bash
git clone https://github.com/YOUR_USERNAME/ecommerce-store.git && cd ecommerce-store/backend && npm install && cp .env.example .env && npm run seed && npm start
```

---

## API Reference

**Base URL:** `http://localhost:5000/api`

### Authentication

| Method | Route | Description | Auth | Body |
|--------|-------|-------------|------|------|
| `POST` | `/api/auth/register` | Register a new user | No | `{ name, email, password }` |
| `POST` | `/api/auth/login` | Log in and receive a JWT | No | `{ email, password }` |

**Responses:**

- **201** `POST /register` — returns `{ _id, name, email, token }`
- **200** `POST /login` — returns `{ _id, name, email, token }`
- **400** — validation error (missing fields, short password, duplicate email)
- **401** — invalid credentials on login

### Products

| Method | Route | Description | Auth | Notes |
|--------|-------|-------------|------|-------|
| `GET` | `/api/products` | List all products | No | Supports `?search=<term>` query |
| `GET` | `/api/products/:id` | Get a single product by ID | No | Returns 404 if not found |
| `POST` | `/api/products` | Create a new product | Yes | Requires JWT in `Authorization` header |

**POST /products body:**

```json
{
  "name": "Product Name",
  "description": "Product description",
  "price": 999,
  "stock": 50,
  "image": "https://example.com/image.jpg"
}
```

### Orders

| Method | Route | Description | Auth | Notes |
|--------|-------|-------------|------|-------|
| `POST` | `/api/orders` | Place an order | Yes | Validates and deducts stock |
| `GET` | `/api/orders` | Get order history | Yes | Returns orders for the logged-in user, newest first |

**POST /orders body:**

```json
{
  "products": [
    { "productId": "<product_id>", "quantity": 2 }
  ]
}
```

**Auth header (required for protected routes):**

```
Authorization: Bearer <your_jwt_token>
```

### Error Responses

All error responses follow a consistent shape:

```json
{
  "message": "Human-readable error description"
}
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request — missing or invalid fields |
| `401` | Unauthorized — missing, invalid, or expired token |
| `404` | Not found — resource does not exist |
| `500` | Server error — unexpected failure |

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/shopeasy` |
| `JWT_SECRET` | Secret key for signing JWTs (min 32 characters) | `a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5` |
| `PORT` | Server port (Render sets this automatically) | `5000` |

### Sample `.env`

```env
# Local development
MONGO_URI=mongodb://localhost:27017/shopeasy
JWT_SECRET=change_this_to_a_long_random_string_in_production
PORT=5000

# Production (MongoDB Atlas)
# MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/shopeasy?retryWrites=true&w=majority
```

> Never commit your `.env` file to version control. It is listed in `.gitignore`.

---

## Seed Data

The `seed.js` script inserts 6 sample products with realistic Indian-market pricing:

| Product | Price (INR) | Stock | Category |
|---------|------------|-------|----------|
| boAt Rockerz 450 Bluetooth Headphones | 1,499 | 120 | Audio |
| Apple AirPods Pro (2nd Gen) | 24,900 | 24 | Audio |
| Noise ColorFit Pro 4 Smartwatch | 3,299 | 85 | Wearables |
| Samsung Galaxy M14 5G (128GB) | 13,499 | 40 | Mobile |
| Logitech K480 Bluetooth Multi-Device Keyboard | 999 | 150 | Accessories |
| Decathlon On-Off Stand-up Desk Chair | 4,499 | 18 | Furniture |

```bash
cd backend && npm run seed
```

---

## Design Decisions

- **Cart is client-side (localStorage)** — users can browse and add items without an account. Authentication is only required at checkout and for viewing order history. This simplifies the backend and improves the browsing experience.
- **Stock deduction is atomic** — the order route uses `findOneAndUpdate` with a `$gte` precondition to prevent race conditions where two concurrent orders could oversell a product.
- **Passwords are never stored in plaintext** — the `User` model has a Mongoose `pre('save')` hook that hashes passwords with bcrypt (10 salt rounds) before persisting.
- **JWT expiry is 7 days** — a reasonable balance between convenience and security for a portfolio project. Tokens are verified by the `authMiddleware.js` `protect` function, which attaches the user (without password) to `req.user`.

---

## Future Enhancements

| Feature | Description | Priority |
|---------|-------------|----------|
| Payment gateway integration | Razorpay or Stripe for online payments | High |
| Admin dashboard | Product CRUD, order management, user listing | High |
| Product categories | Organize products into browsable categories | Medium |
| Product reviews and ratings | User-generated star ratings and text reviews | Medium |
| Wishlist | Save products for later | Low |
| Email notifications | Order confirmation and status update emails | Low |
| Coupon and discount codes | Promotional pricing at checkout | Low |
| Server-side cart | Persist cart in the database per user | Low |
| Pagination | Paginated product listing for large catalogues | Low |
| Product image upload | Multer/S3-based image upload for admin product creation | Medium |

---

## License

This project is licensed under the [MIT License](LICENSE).

```
MIT License

Copyright (c) 2026 ShopEasy Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

**Built with care for learning and portfolio purposes.**

If you found this project helpful, consider giving it a star on GitHub.

</div>
