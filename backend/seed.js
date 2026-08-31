const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

// Sample seed data — 6 products to test with
const products = [
  {
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium over-ear wireless headphones with active noise cancellation, 30-hour battery life, and deep bass. Perfect for music lovers and remote workers.',
    price: 79.99,
    stock: 50,
    image: 'https://via.placeholder.com/300x300?text=Headphones',
  },
  {
    name: 'Smart Watch Series 5',
    description: 'Track your fitness, heart rate, and notifications with this sleek smart watch. Water-resistant up to 50 meters with a vibrant AMOLED display.',
    price: 199.99,
    stock: 30,
    image: 'https://via.placeholder.com/300x300?text=Smart+Watch',
  },
  {
    name: 'Mechanical Gaming Keyboard',
    description: 'RGB backlit mechanical keyboard with hot-swappable switches and durable aluminum frame. Ideal for gaming and heavy typing sessions.',
    price: 89.5,
    stock: 75,
    image: 'https://via.placeholder.com/300x300?text=Keyboard',
  },
  {
    name: '4K Ultra HD Monitor 27"',
    description: '27-inch 4K UHD IPS monitor with 99% sRGB color accuracy and frameless design. Great for design, gaming, and productivity.',
    price: 349.0,
    stock: 20,
    image: 'https://via.placeholder.com/300x300?text=Monitor',
  },
  {
    name: 'Ergonomic Office Chair',
    description: 'Breathable mesh office chair with lumbar support, adjustable armrests, and 4D headrest. Comfortable for all-day working.',
    price: 159.0,
    stock: 15,
    image: 'https://via.placeholder.com/300x300?text=Chair',
  },
  {
    name: 'Portable USB-C Power Bank 20000mAh',
    description: 'High-capacity power bank with fast charging, dual output ports, and LED battery indicator. Keep your devices charged on the go.',
    price: 39.99,
    stock: 100,
    image: 'https://via.placeholder.com/300x300?text=Power+Bank',
  },
];

// Clear existing and insert seed data
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await Product.deleteMany({});
    const inserted = await Product.insertMany(products);
    console.log(`Seeded ${inserted.length} products`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed error:', err.message);
    process.exit(1);
  });
