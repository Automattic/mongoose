'use strict';
const stripe = require('stripe')(process.env.STRIPE_KEY);

const { Cart, Order, Product } = require('../models');

const handler = async(event) => {
  try {
    const stripeProducts = { line_items: [] };
    let total = 0;
    for (let i = 0; i < event.body.product.length; i++) {
      const product = await Product.findOne({ _id: event.body.product[i].productId });
      stripeProducts.line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.productName
          },
          unit_amount: product.productPrice
        },
        quantity: event.body.product[i].quantity
      });
      total = total + (product.productPrice * event.body.product[i].quantity);
    }
    const session = await stripe.checkout.sessions.create({
      line_items: stripeProducts.line_items,
      mode: 'payment',
      success_url: 'insert a url here',
      cancel_url: 'insert a url here'
    });
    const intent = await stripe.paymentIntents.retrieve(session.payment_intent);
    if (intent.status !== 'succeeded') {
      throw new Error(`Checkout failed because intent has status "${intent.status}"`);
    }
    const paymentMethod = await stripe.paymentMethods.retrieve(intent['payment_method']);
    const orders = await Order.find();
    const orderNumber = orders.length ? orders.length + 1 : 1;
    const order = await Order.create({
      items: event.body.product,
      total: total,
      orderNumber: orderNumber,
      name: event.body.name,
      email: event.body.email,
      address1: event.body.address1,
      city: event.body.city,
      state: event.body.state,
      zip: event.body.zip,
      shipping: event.body.shipping,
      paymentMethod: paymentMethod ? { id: paymentMethod.id, brand: paymentMethod.brand, last4: paymentMethod.last4 } : null
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