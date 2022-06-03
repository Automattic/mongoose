'use strict';
const stripe = require('stripe')('insert your stripe key here');

const { Cart, Order } = require('../../models');

const handler = async(event) => {
  try {
    const stripeProducts = { line_items: [] };
    for (let i = 0; i < event.body.products.length; i++) {
      stripeProducts.line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: event.body.products[i].name
          },
          unit_amount: event.body.products[i].productPrice,
        },
        quantity: event.body.quantity
      });
    }
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: event.body.products
          }
        }
      }],
      mode: 'payment',
      success_url: 'insert a url here',
      cancel_url: 'insert a url here'
    });
    
    const order = await Order.create({
      items: event.body.products,
      total: event.body.total,
      orderNumber: event.body.orderNumber,
      name: event.body.name,
      email: event.body.email,
      address1: event.body.address1,
      city: event.body.city,
      state: event.body.state,
      zip: event.body.zip,
      location: { lat: event.body.lat, lng: event.body.lng },
      shipping: event.body.shipping,
      paymentMethod: { id: event.body.paymentMethod.id, brand: event.body.paymentMethod.brand, last4: event.body.paymentMethod.last4 },
      trackingNumber: event.body.trackingNumber
    });
    const cart = await Cart.findOne({ _id: event.body.cartId });
    cart.orderId = order._id;
    await cart.save();
    return { statusCode: 500, body: { order: order, cart: cart }, headers: { Location: session.url } };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };