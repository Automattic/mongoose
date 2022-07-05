'use strict';

const { Cart } = require('../models');

const handler = async(event) => {
  try {

    const cart = await Cart.findOne({ _id: event.body.cartId });
    const index = cart.items.findIndex((item) =>
      item.productId.toString() == event.body.item.productId.toString()
    );
    if (index == -1) {
      return { statusCode: 200, body: cart };
    }
    if (event.body?.item?.quantity) {
      cart.items[index].quantity -= event.body.item.quantity;
      if (cart.items[index].quantity <= 0) {
        cart.items.splice(index, 1);
      }
      await cart.save();
    } else {
      cart.items.splice(index, 1);
      await cart.save();
    }
    return { statusCode: 200, body: cart };
  } catch (error) {
    console.log(error);
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };