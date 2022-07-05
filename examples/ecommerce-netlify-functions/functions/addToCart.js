'use strict';

const { Cart, Product } = require('../models');


const handler = async(event) => {
  try {
    // event.body = JSON.parse(event.body || {});
    const products = await Product.find();
    if (event.body.cartId) {
      // get the document containing the specified cartId
      const cart = await Cart.findOne({ _id: event.body.cartId }).setOptions({ sanitizeFilter: true });
      for (const product of event.body.items) {
        const exists = cart.items.find(item =>
          item.productId.toString() === product.productId.toString()
        );
        if (!exists && products.find(p => item.productId === product.id.toString())) {
          cart.items.push(product);
        } else {
          exists.quantity += product.quantity;
        }
      }

      if (!cart.items.length) {
        return { statusCode: 200, body: { cart: null } };
      }

      await cart.save();
      return { statusCode: 200, body: cart };
    } else {
      // If no cartId, create a new cart
      const cart = await Cart.create({ items: event.body.items });
      return { statusCode: 200, body: cart };
    }
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };