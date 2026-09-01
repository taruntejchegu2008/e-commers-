const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const { insertOrder, updateOrderStatus } = require('../utils/supabaseSync');

const router = express.Router();

// POST /api/orders — create order. Validates ALL items first, then deducts
// stock atomically with a guarded $inc (so concurrent checkouts cannot
// oversell). If any step fails, previously deducted stock is restored.
router.post('/', protect, async (req, res) => {
  const deducted = [];
  try {
    const { products, shipping, paymentMethod, paymentDetails } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of products with productId and quantity' });
    }

    // --- Phase 0: validate shipping + payment details BEFORE touching stock ---
    const ship = {
      fullName: typeof (shipping && shipping.fullName) === 'string' ? shipping.fullName.trim() : '',
      phone: typeof (shipping && shipping.phone) === 'string' ? shipping.phone.trim() : '',
      address: typeof (shipping && shipping.address) === 'string' ? shipping.address.trim() : '',
      city: typeof (shipping && shipping.city) === 'string' ? shipping.city.trim() : '',
      state: typeof (shipping && shipping.state) === 'string' ? shipping.state.trim() : '',
      pincode: typeof (shipping && shipping.pincode) === 'string' ? shipping.pincode.trim() : '',
    };

    const missingShip = ['fullName', 'phone', 'address', 'city', 'state', 'pincode'].filter((k) => !ship[k]);
    if (missingShip.length > 0) {
      return res.status(400).json({ message: `Shipping details required: ${missingShip.join(', ')}` });
    }
    if (!/^[0-9]{10}$/.test(ship.phone)) {
      return res.status(400).json({ message: 'Phone number must be 10 digits' });
    }
    if (!/^[0-9]{6}$/.test(ship.pincode)) {
      return res.status(400).json({ message: 'Pincode must be 6 digits' });
    }

    const VALID_PAYMENTS = ['cod', 'card', 'upi'];
    if (!VALID_PAYMENTS.includes(paymentMethod)) {
      return res.status(400).json({ message: `Payment method must be one of: ${VALID_PAYMENTS.join(', ')}` });
    }

    // Mock gateway: card/UPI are considered paid immediately; COD stays pending.
    let paymentStatus = 'Pending';
    const paymentReference = {};
    if (paymentMethod === 'card') {
      const cardLast4 = (paymentDetails && String(paymentDetails.last4 || '').replace(/\D/g, ''));
      if (!cardLast4 || cardLast4.length !== 4) {
        return res.status(400).json({ message: 'Valid card last 4 digits are required' });
      }
      paymentStatus = 'Paid';
      paymentReference.last4 = cardLast4;
      paymentReference.provider = (paymentDetails && String(paymentDetails.provider || 'Card')).slice(0, 20);
    } else if (paymentMethod === 'upi') {
      const upi = (paymentDetails && String(paymentDetails.upiId || '').trim());
      if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upi)) {
        return res.status(400).json({ message: 'Enter a valid UPI ID (e.g. name@bank)' });
      }
      paymentStatus = 'Paid';
      paymentReference.provider = upi.split('@')[1];
    } else {
      paymentStatus = 'Pending'; // COD — paid on delivery
      paymentReference.provider = 'Cash on Delivery';
    }
    paymentReference.transactionId = Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();

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
      shipping: ship,
      paymentMethod,
      paymentStatus,
      paymentReference,
    });

    const populatedOrder = await Order.findById(order._id).populate('products.productId', 'name price image');

    // Best-effort mirror into Supabase. Never blocks or fails the response.
    await insertOrder({
      mongoId: order._id.toString(),
      userId: req.user.supabaseUid || null,
      userEmail: req.user.email,
      customerName: ship.fullName,
      totalAmount: order.totalAmount,
      status: 'Placed',
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      shipping: ship,
      items: itemsSnapshot,
    });

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
    const allowed = ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
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

    // Best-effort mirror of the new status into Supabase.
    await updateOrderStatus(order._id.toString(), status);

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
});

module.exports = router;
