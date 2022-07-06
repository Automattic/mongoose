'use strict';

const { Cart } = require('../../models');
const connect = require('../../index');

const handler = async(event) => {
  try {
    await connect();
    // get the document containing the specified cartId
    const cart = await Cart.
      findOne({ _id: event.queryStringParameters.cartId }).
      setOptions({ sanitizeFilter: true });
    return { statusCode: 200, body: JSON.stringify({ cart }) };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };