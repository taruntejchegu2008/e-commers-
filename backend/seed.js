// ===== ShopEasy Database Seeder =====
// Usage: node seed.js
// Reads MONGO_URI from backend/.env, clears the products collection,
// and inserts 6 sample products with realistic INR pricing.
//
// IMPORTANT: This seeder writes to your configured database and FIRST
// deletes ALL existing products. Do NOT point it at a production DB.

const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
require('dotenv').config(); // loads backend/.env

const products = [
  {
    name: 'boAt Rockerz 450 Bluetooth Headphones',
    slug: 'boat-rockerz-450-bluetooth-headphones',
    description:
      'Wireless over-ear headphones with up to 15 hours of playback, deep bass (40mm drivers), and quick USB-C charging. Ideal for everyday listening and calls.',
    price: 1499,
    stock: 120,
    category: 'audio',
    isActive: true,
    image: 'https://via.placeholder.com/300x300?text=Rockerz+450',
  },
  {
    name: 'Apple AirPods Pro (2nd Gen)',
    slug: 'apple-airpods-pro-2nd-gen',
    description:
      'Active Noise Cancellation, Adaptive Transparency, personalised spatial audio, and MagSafe charging case with up to 30 hours total battery life.',
    price: 24900,
    stock: 24,
    category: 'audio',
    isActive: true,
    image: 'https://via.placeholder.com/300x300?text=AirPods+Pro',
  },
  {
    name: 'Noise ColorFit Pro 4 Smartwatch',
    slug: 'noise-colorfit-pro-4-smartwatch',
    description:
      '1.43-inch AMOLED display, Bluetooth calling, 100+ sports modes, heart-rate and SpO2 monitoring, and 7 days of battery life. IP68 water resistant.',
    price: 3299,
    stock: 85,
    category: 'wearables',
    isActive: true,
    image: 'https://via.placeholder.com/300x300?text=ColorFit+Pro+4',
  },
  {
    name: 'Samsung Galaxy M14 5G (128GB)',
    slug: 'samsung-galaxy-m14-5g-128gb',
    description:
      '6.6-inch FHD+ display, MediaTek Dimensity 700 processor, 50MP triple camera, and a massive 6000mAh battery with 25W fast charging.',
    price: 13499,
    stock: 40,
    category: 'mobile',
    isActive: true,
    image: 'https://via.placeholder.com/300x300?text=Galaxy+M14',
  },
  {
    name: 'Logitech K480 Bluetooth Multi-Device Keyboard',
    slug: 'logitech-k480-bluetooth-multi-device-keyboard',
    description:
      'Pair up to three devices (phone, tablet, laptop) and switch with a dial. Built-in cradle holds your device while typing. Bluetooth 3.0, 24-month battery life.',
    price: 999,
    stock: 150,
    category: 'accessories',
    isActive: true,
    image: 'https://via.placeholder.com/300x300?text=K480+Keyboard',
  },
  {
    name: 'Decathlon On-Off Stand-up Desk Chair',
    slug: 'decathlon-on-off-stand-up-desk-chair',
    description:
      'Comfortable task chair with adjustable seat height, breathable backrest, and smooth castors. Max load 120kg. Great for home workspaces.',
    price: 4499,
    stock: 18,
    category: 'furniture',
    isActive: true,
    image: 'https://via.placeholder.com/300x300?text=Desk+Chair',
  },
];

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set. Make sure backend/.env exists (copy .env.example).');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Reset the products collection (DANGER: deletes existing data)
  const deleted = await Product.deleteMany({});
  console.log(`Cleared ${deleted.deletedCount} existing product(s)`);

  const seeded = await Product.insertMany(products);
  console.log(`Seeded ${seeded.length} products:`);
  seeded.forEach((p) => console.log(`  - ${p.name} (₹${p.price}, stock: ${p.stock})`));

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