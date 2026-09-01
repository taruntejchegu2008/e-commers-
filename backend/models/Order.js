const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Placed',
  },
  // Customer delivery details collected at checkout
  shipping: {
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
  },
  // Payment method + state. COD starts as Pending (paid on delivery);
  // card/UPI are marked Paid after the (mock) gateway confirms.
  paymentMethod: {
    type: String,
    enum: ['cod', 'card', 'upi'],
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending',
  },
  // Lightweight masked payment reference (mock gateway): card last4 / UPI provider
  paymentReference: {
    last4: { type: String },
    provider: { type: String },
    transactionId: { type: String },
  },
  // Snapshot of line items so the order stays readable even if a product is
  // later deleted or edited. productId is kept for reference.
  itemsSnapshot: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true, min: 0 },
      quantity: { type: Number, required: true, min: 1 },
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
