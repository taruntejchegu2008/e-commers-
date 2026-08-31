const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/orders — create order from cart items
router.post('/', protect, async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of products with productId and quantity' });
    }

    // Validate each product and calculate total
    let totalAmount = 0;
    const orderProducts = [];

    for (const item of products) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ message: 'Each item must have a valid productId and quantity >= 1' });
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.productId}` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}` });
      }

      // Deduct stock
      product.stock -= item.quantity;
      await product.save();

      totalAmount += product.price * item.quantity;
      orderProducts.push({ productId: product._id, quantity: item.quantity });
    }

    // Create the order
    const order = await Order.create({
      userId: req.user._id,
      products: orderProducts,
      totalAmount,
    });

    // Populate product details for the response
    const populatedOrder = await Order.findById(order._id).populate('products.productId', 'name price image');

    res.status(201).json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
});

// GET /api/orders — get logged-in user's order history
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate('products.productId', 'name price image')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

module.exports = router;
