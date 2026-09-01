const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

const router = express.Router();

// POST /api/orders — create order. Validates ALL items first, then deducts
// stock atomically with a guarded $inc (so concurrent checkouts cannot
// oversell). If any step fails, previously deducted stock is restored.
router.post('/', protect, async (req, res) => {
  const deducted = [];
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of products with productId and quantity' });
    }

    // --- Phase 1: validate every item before touching any stock ---
    let totalAmount = 0;
    const orderProducts = [];
    const itemsSnapshot = [];

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

      totalAmount += product.price * item.quantity;
      orderProducts.push({ productId: product._id, quantity: item.quantity, name: product.name });
      itemsSnapshot.push({
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        productId: product._id,
      });
    }

    // --- Phase 2: atomically deduct stock (guarded so two checkouts can not
    // both buy the last item). If any product's stock changed meanwhile
    // (race condition), restore the stock we already deducted and abort. ---
    for (const item of orderProducts) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      ).exec();

      if (!updated) {
        // The current item was NOT deducted (guarded update returned null),
        // but earlier items in this request already had their stock deducted.
        // Restore those earlier deductions so partial failures never leak.
        for (const d of deducted) {
          await Product.updateOne({ _id: d.productId }, { $inc: { stock: d.quantity } });
        }
        return res.status(400).json({ message: 'Sorry, stock changed while placing your order. Please review your cart.' });
      }
      deducted.push({ productId: item.productId, quantity: item.quantity });
    }

    // --- Phase 3: create the order ---
    const order = await Order.create({
      userId: req.user._id,
      products: orderProducts.map((o) => ({ productId: o.productId, quantity: o.quantity })),
      itemsSnapshot,
      totalAmount,
    });

    const populatedOrder = await Order.findById(order._id).populate('products.productId', 'name price image');
    return res.status(201).json(populatedOrder);
  } catch (error) {
    // Best-effort restore of any stock deducted before the unexpected failure,
    // so a re-listed product never loses inventory without an order.
    for (const d of deducted) {
      await Product.updateOne({ _id: d.productId }, { $inc: { stock: d.quantity } }).catch(() => {});
    }
    return res.status(500).json({ message: 'Error creating order', error: error.message });
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

// GET /api/orders/all — admin: see every order (must precede the /:id route)
router.get('/all', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email')
      .populate('products.productId', 'name price image')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// PUT /api/orders/:id/status — admin: update an order's processing status
router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
});

module.exports = router;
