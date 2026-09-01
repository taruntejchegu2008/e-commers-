const express = require('express');
const Product = require('../models/Product');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

const router = express.Router();

// GET /api/products — list all products.
// Supports ?search= (name/category/brand/description) and ?category= filters.
router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = {};

    // Category filter (exact match).
    if (category && String(category).trim()) {
      query.category = String(category).trim();
    }

    // If search param provided, match across name, brand, category,
    // and description (case-insensitive partial match).
    if (search) {
      const term = String(search).trim();

      // Bound the search length to avoid expensive/abusive regex queries
      if (term.length > 80) {
        return res.status(400).json({ message: 'Search term is too long (max 80 characters)' });
      }

      // Escape regex metacharacters so user input is treated literally
      // (prevents ReDoS via crafted patterns like (a+)+$ and query abuse)
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = { $regex: escaped, $options: 'i' };
      query.$or = [
        { name: regex },
        { brand: regex },
        { category: regex },
        { description: regex },
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// GET /api/products/categories — distinct list of product categories.
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
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

// POST /api/products — create a product (admin-only)
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, description, price, stock, image, category, brand } = req.body;

    const trimmedName = String(name || '').trim();
    const trimmedDescription = String(description || '').trim();

    if (!trimmedName || !trimmedDescription || price === undefined || stock === undefined) {
      return res.status(400).json({ message: 'Please provide name, description, price, and stock' });
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ message: 'Price must be a positive number' });
    }
    if (isNaN(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({ message: 'Stock must be a non-negative number' });
    }

    const product = await Product.create({
      name: trimmedName,
      description: trimmedDescription,
      price: Number(price),
      stock: Number(stock),
      category: String(category || '').trim() || 'General',
      brand: String(brand || '').trim(),
      image: String(image || '').trim() || 'https://via.placeholder.com/300x300?text=No+Image',
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

// PUT /api/products/:id — update a product (admin-only)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, description, price, stock, image, category, brand } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (description !== undefined) updateData.description = String(description).trim();
    if (price !== undefined) updateData.price = Number(price);
    if (stock !== undefined) updateData.stock = Number(stock);
    if (image !== undefined) updateData.image = String(image).trim();
    if (category !== undefined) updateData.category = String(category).trim();
    if (brand !== undefined) updateData.brand = String(brand).trim();

    // Clear validation errors with 400, never a silent 500
    if (updateData.name !== undefined && !updateData.name) {
      return res.status(400).json({ message: 'Name cannot be blank' });
    }
    if (updateData.description !== undefined && !updateData.description) {
      return res.status(400).json({ message: 'Description cannot be blank' });
    }
    if (updateData.price !== undefined && (isNaN(updateData.price) || updateData.price <= 0)) {
      return res.status(400).json({ message: 'Price must be a positive number' });
    }
    if (updateData.stock !== undefined && (isNaN(updateData.stock) || updateData.stock < 0)) {
      return res.status(400).json({ message: 'Stock must be a non-negative number' });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// DELETE /api/products/:id — delete a product (admin-only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

module.exports = router;
