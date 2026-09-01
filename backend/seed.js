// ===== ShopEasy Database Seeder =====
// Usage: node seed.js
// Reads MONGO_URI from backend/.env, clears the products collection,
// and inserts the full product catalog (600 products across 20 categories)
// generated from the product spreadsheet (backend/data/seedProducts.json).
//
// IMPORTANT: This seeder writes to your configured database and FIRST
// deletes ALL existing products. Do NOT point it at a production DB.

const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
const seedProducts = require('./data/seedProducts.json');
require('dotenv').config(); // loads backend/.env

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set. Make sure backend/.env exists (copy .env.example).');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Reset the products collection (DANGER: deletes existing data)
  const deleted = await Product.deleteMany({});
  console.log(`Cleared ${deleted.deletedCount} existing product(s)`);

  const seeded = await Product.insertMany(seedProducts);
  console.log(`Seeded ${seeded.length} products across ${
    new Set(seeded.map((p) => p.category)).size
  } categories:`);
  const byCat = {};
  seeded.forEach((p) => { byCat[p.category] = (byCat[p.category] || 0) + 1; });
  Object.keys(byCat).forEach((c) => console.log(`  - ${c}: ${byCat[c]} products`));

  // Seed an admin user so the admin panel can be tested
  const existingAdmin = await User.findOne({ email: 'admin@shopeasy.com' });
  let adminUser;
  if (existingAdmin) {
    adminUser = existingAdmin;
    console.log(`Admin user already exists (${adminUser.email})`);
  } else {
    adminUser = await User.create({
      name: 'ShopEasy Admin',
      email: 'admin@shopeasy.com',
      password: 'admin123',
      isAdmin: true,
    });
    console.log(`Seeded admin user: ${adminUser.email} / admin123`);
  }

  process.exit(0);
}

run()
  .catch((err) => {
    console.error('Seed error:', err.message);
    process.exit(1);
  });