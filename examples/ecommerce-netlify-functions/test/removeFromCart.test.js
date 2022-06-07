'use strict';

const { describe, it, before, after } = require('mocha');
const assert = require('assert');
const { handler: addToCart } = require('../functions/addToCart');
const { handler: removeFromCart } = require('../functions/removeFromCart');
const mongoose = require('mongoose');



describe('Remove From Cart', function() {
  before(async() => {
    await mongoose.connect('mongodb://localhost:27017/netlify');
  });

  after(async() => {
    await mongoose.disconnect();
  });

  it('Should create a cart and then it should remove the entire item from it.', async function() {
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
    assert.equal(result.body.items.length, 2);
    const newParams = {
      body: {
        cartId: result.body._id,
        productId: '629e5f3686d82fc73b95b396'
      }
    };
    const remove = await removeFromCart(newParams);
    assert.equal(remove.body.items.length, 1);
  });

  it('Should create a cart and then it should reduce the quantity of an item from it.', async function() {
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
    const newParams = {
      body: {
        cartId: result.body._id,
        product: {
          productId: '629e5f3686d82fc73b95b396',
          quantity: 1
        }
      }
    };
    const remove = await removeFromCart(newParams);
    assert.equal(remove.body.items[0].quantity, 1);
  });

});