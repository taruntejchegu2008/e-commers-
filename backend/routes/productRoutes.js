const express = require('express');
const Product = require('../models/Product');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/products — list all products, supports ?search= query
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    // If search param provided, filter by name (case-insensitive partial match)
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// GET /api/products/:id — get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

// POST /api/products — create a product (admin-protected)
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, price, stock, image } = req.body;

    if (!name || !description || price === undefined || stock === undefined) {
      return res.status(400).json({ message: 'Please provide name, description, price, and stock' });
    }

    if (price < 0 || stock < 0) {
      return res.status(400).json({ message: 'Price and stock must be non-negative' });
    }

    const product = await Product.create({ name, description, price, stock, image });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

module.exports = router;
