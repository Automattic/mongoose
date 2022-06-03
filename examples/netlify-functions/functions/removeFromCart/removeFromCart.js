'use strict';

const { Cart } = require('../../models');

const handler = async(event) => {
  try {
    const cart = await Cart.findOne({ _id: event.body.cartId });
    const index = cart.products.findIndex((item) => {
      return item._id == event.body.productId;
    });
    cart.products.splice(index, 1);
    await cart.save();
    return { statusCode: 200, body: cart };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };