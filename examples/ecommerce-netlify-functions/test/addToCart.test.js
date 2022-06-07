'use strict';

const { describe, it, before, after } = require('mocha');
const assert = require('assert');
const { handler: addToCart } = require('../functions/addToCart');
const mongoose = require('mongoose');



describe('Add to Cart', function() {
  before(async() => {
    await mongoose.connect('mongodb://localhost:27017/netlify');
  });

  after(async() => {
    await mongoose.disconnect();
  });
  it('Should create a cart and add a product to the cart.', async function() {
    const params = {
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
  });
  it('Should find the cart and add to it.', async function() {
    const params = {
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
    params.body.cartId = result.body._id;
    const findCart = await addToCart(params);
    assert(findCart.body);
    assert.deepStrictEqual(findCart.body._id, result.body._id);
    assert.equal(findCart.body.items[0].quantity, 4);
    assert.equal(findCart.body.items[1].quantity, 2);
  });
});
