'use strict';
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: String,
  productPrice: Number,
  quantity: Number
});

const Product = mongoose.model('Product', productSchema);

module.exports.Product = Product;

const orderSchema = new mongoose.Schema({
  items: [productSchema],
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
  location: new mongoose.Schema({
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  }, { _id: false }),
  shipping: {
    type: String,
    required: true,
    enum: ['standard', '2day']
  },
  paymentMethod: {
    id: String,
    brand: String,
    last4: String
  },
  salesTax: {
    type: Number,
    default: 0
  },
  trackingNumber: {
    type: String
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports.Order = Order;

const cartSchema = new mongoose.Schema({
  products: [productSchema],
  orderId: { type: mongoose.Types.ObjectId, ref: 'Order' }
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);

module.exports.Cart = Cart;

async function run() {
  await mongoose.connect('mongodb://localhost:27017/netlify');
  await mongoose.connection.dropDatabase();

  await Product.create({
    productName: 'Netlify\'s First Flight',
    productPrice: 2000,
    quantity: 5
  });

  await Product.create({
    productName: 'Netlify The Movie',
    productPrice: 4000,
    quantity: 5
  });

  await Product.create({
    productName: 'Netlify vs The Internet',
    productPrice: 6000,
    quantity: 5
  });

  await Product.create({
    productName: 'Netlify and The Wasp',
    productPrice: 8000,
    quantity: 5
  });
}

run();

