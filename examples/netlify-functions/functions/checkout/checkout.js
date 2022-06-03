'use strict';

const { Cart, Order } = require('../../models');

const handler = async(event) => {
  try {
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
    return { statusCode: 500, body: { order: order, cart: cart } };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };