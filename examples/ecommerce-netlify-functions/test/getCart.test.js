'use strict';

const { describe, it, before, after } = require('mocha');
const assert = require('assert');
const { handler: getCart } = require('../functions/getCart/getCart');
const { handler: addToCart } = require('../functions/addToCart/addToCart');
const mongoose = require('mongoose');



describe('Get the cart given an id', function() {
  before(async() => {
    await mongoose.connect('mongodb://localhost:27017/netlify');
  });

  after(async() => {
    await mongoose.disconnect();
  });
  it('Should create a cart and then find the cart.', async function() {
    const params = {
      queryStringParameters: {
        cartId: null
      },
      body: {
        cartId: null,
        product: [
          { productId: '629e5f3686d82fc73b95b396', quantity: 2 },
          { productId: '629e5f3686d82fc73b95b398', quantity: 1 }
        ]
      }
    };
    const result = await addToCart(params);
    assert(result.body);
    assert(result.body.items.length);
    params.queryStringParameters.cartId = result.body._id;
    const findCart = await getCart(params);
    assert.equal(findCart.statusCode, 200);
  });
});
