'use strict';
const stripe = require('stripe')(process.env.STRIPE_KEY);

const { Cart, Order, Product } = require('../models');

const handler = async(event) => {
  try {
    const stripeProducts = { line_items: [] };
    const total = 0;
    for (let i = 0; i < event.body.products.length; i++) {
      const product = await Product.findOne({_id: event.body.products[i].productId});
      stripeProducts.line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.productName
          },
          unit_amount: product.productPrice,
        },
        quantity: event.body.products[i].quantity
      });
      total = total + (product.productPrice * event.body.products[i].quantity);
    }
    const salesTax = total * .06;
    const session = await stripe.checkout.sessions.create({
      line_items: stripeProducts.line_items,
      mode: 'payment',
      success_url: 'insert a url here',
      cancel_url: 'insert a url here'
    });
    const orders = await Order.find();
    const orderNumber = orders.length ? orders.length + 1 : 1;
    const order = await Order.create({
      items: event.body.products,
      total: total,
      orderNumber: orderNumber,
      name: event.body.name,
      email: event.body.email,
      address1: event.body.address1,
      city: event.body.city,
      state: event.body.state,
      zip: event.body.zip,
      location: { lat: event.body.lat, lng: event.body.lng },
      shipping: event.body.shipping,
      paymentMethod: { id: event.body.paymentMethod.id, brand: event.body.paymentMethod.brand, last4: event.body.paymentMethod.last4 },
      salesTax: salesTax
    });
    const cart = await Cart.findOne({ _id: event.body.cartId });
    cart.orderId = order._id;
    await cart.save();
    return { statusCode: 200, body: { order: order, cart: cart }, headers: { Location: session.url } };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };