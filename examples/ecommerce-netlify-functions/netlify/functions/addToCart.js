'use strict';

const { Cart, Product } = require('../../models');
const connect = require('../../connect');

const handler = async(event) => {
  try {
    event.body = JSON.parse(event.body || {});
    await connect();
    const products = await Product.find();
    if (event.body.cartId) {
      // get the document containing the specified cartId
      const cart = await Cart.findOne({ _id: event.body.cartId }).setOptions({ sanitizeFilter: true });
      
      if (cart == null) {
        return { statusCode: 404, body: JSON.stringify({ message: 'Cart not found' }) };
      }
      if(!Array.isArray(event.body.items)) {
        return { statusCode: 500, body: JSON.stringify({ error: 'items is not an array' }) };
      }
      for (const product of event.body.items) {
        const exists = cart.items.find(item => item?.productId?.toString() === product?.productId?.toString());
        if (!exists && products.find(p => product?.productId?.toString() === p?._id?.toString())) {
          cart.items.push(product);
          await cart.save();
        } else {
          exists.quantity += product.quantity;
          await cart.save();
        }
      }

      if (!cart.items.length) {
        return { statusCode: 200, body: JSON.stringify({ cart: null }) };
      }

      await cart.save();
      return { statusCode: 200, body: JSON.stringify(cart) };
    } else {
      // If no cartId, create a new cart
      const cart = await Cart.create({ items: event.body.items });
      return { statusCode: 200, body: JSON.stringify(cart) };
    }
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };