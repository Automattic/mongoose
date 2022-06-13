'use strict';
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: String,
  productPrice: Number
});

const Product = mongoose.model('Product', productSchema);

module.exports.Product = Product;

const orderSchema = new mongoose.Schema({
  items: [
    { productId: { type: mongoose.ObjectId, required: true, ref: 'Product' },
      quantity: { type: Number, required: true, validate: v => v > 0 }
    }
  ],
  total: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['PAID', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED'],
    default: 'PAID'
  },
  orderNumber: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  address1: {
    type: String,
    required: true
  },
  address2: {
    type: String
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  zip: {
    type: String,
    required: true
  },
  shipping: {
    type: String,
    required: true,
    enum: ['standard', '2day']
  },
  paymentMethod: {
    id: String,
    brand: String,
    last4: String
  }
}, { optimisticConcurrency: true });

const Order = mongoose.model('Order', orderSchema);

module.exports.Order = Order;

const cartSchema = new mongoose.Schema({
  items: [{ productId: { type: mongoose.ObjectId, required: true, ref: 'Product' }, quantity: { type: Number, required: true } }],
  orderId: { type: mongoose.ObjectId, ref: 'Order' }
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);

module.exports.Cart = Cart;

