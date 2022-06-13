'use strict';

const { Cart } = require('../models');

const handler = async(event) => {
  try {
    const cart = await Cart.findOne({ _id: event.body.cartId });
    const index = cart.items.findIndex((item) =>
      item.productId == event.body.product.productId
    );
    if (index == -1) {
      return { statusCode: 500, body: 'Product not found' };
    }
    if (event.body?.product?.quantity) {
      cart.items[index].quantity -= event.body.product.quantity;
      await cart.save();
    } else {
      cart.items.splice(index, 1);
      await cart.save();
    }
    return { statusCode: 200, body: cart };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };