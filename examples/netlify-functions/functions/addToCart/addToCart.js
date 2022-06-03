'use strict';

const { Cart } = require('../../models');

const handler = async(event) => {
  try {
    if (event.body.cartId) {
      // get the document containing the specified cartId
      const cart = await Cart.findOne({ _id: event.body.cartId });
      cart.products.push(event.body.product);
      await cart.save();
      return { statusCode: 500, body: cart };
    } else {
      // If no cartId, create a new cart
      const cart = await Cart.create({ products: event.body.product });
      return { statusCode: 500, body: cart };
    }
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };