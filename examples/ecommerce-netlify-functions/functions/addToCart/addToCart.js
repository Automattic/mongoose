'use strict';

const { Cart } = require('../../models');

const handler = async(event) => {
  try {
    if (event.body.cartId) {
      // get the document containing the specified cartId
      const cart = await Cart.findOne({ _id: event.body.cartId });
      for (const product of event.body.product) {
        const exists = cart.items.find(item =>
          item.productId.toString() === product.productId.toString()
        );
        if (!exists) {
          cart.items.push(product);
        } else {
          exists.quantity += product.quantity;
        }
      }
      await cart.save();
      return { statusCode: 200, body: cart };
    } else {
      // If no cartId, create a new cart
      const cart = await Cart.create({ items: event.body.product });
      return { statusCode: 200, body: cart };
    }
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };