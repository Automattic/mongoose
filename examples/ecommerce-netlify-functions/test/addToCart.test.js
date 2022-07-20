'use strict';

const { describe, it, before, after } = require('mocha');
const assert = require('assert');
const { handler: addToCart } = require('../netlify/functions/addToCart');
const mongoose = require('mongoose');
const fixtures = require('../test/fixtures');

describe('Add to Cart', function() {
  it('Should create a cart and add a product to the cart', async function() {
    const products = await fixtures.createProducts({
      product: [
        { name: 'A Test Products', price: 500 },
        { name: 'Another Test Product', price: 600 }
      ]
    }).then((res) => res.products);
    const params = {
      body: {
        cartId: null,
        items: [
          { productId: products[0]._id, quantity: 2 },
          { productId: products[1]._id, quantity: 1 }
        ]
      }
    };
    params.body = JSON.stringify(params.body);
    const result = await addToCart(params);
    result.body = JSON.parse(result.body);
    assert(result.body);
    assert(result.body.items.length);
  });
  it('Should find the cart and add to the cart', async function() {
    const products = await fixtures.createProducts({product: [{ productName: 'A Test Products', productPrice: 500 }, {productName: 'Another Test Product', productPrice: 600 }]})
    .then((res) => res.products);
    const { cart } = await fixtures.createCart({products: []});
    const params = {
      body: {
        cartId: cart._id,
        items: [
          { productId: products[0]._id, quantity: 2 },
          { productId: products[1]._id, quantity: 1 }
        ]
      }
    };
    params.body = JSON.stringify(params.body);
    const findCart = await addToCart(params);
    findCart.body = JSON.parse(findCart.body);
    assert(findCart.body);
    assert.equal(findCart.body.items.length, 2)
  });
  it('Should find the cart and increase the quantity of the item(s) in the cart', async function() {
    const products = await fixtures.createProducts({product: [{ productName: 'A Test Products', productPrice: 500 }, {productName: 'Another Test Product', productPrice: 600 }]})
    .then((res) => res.products);
    const { cart } = await fixtures.createCart({products: []});
    const params = {
      body: {
        cartId: cart._id,
        items: [
          { productId: products[0]._id, quantity: 2 },
          { productId: products[1]._id, quantity: 1 }
        ]
      }
    };
    params.body = JSON.stringify(params.body);
    const findCart = await addToCart(params);
    findCart.body = JSON.parse(findCart.body);
    assert(findCart.body);
    assert.equal(findCart.body.items.length, 2);
    assert.equal(findCart.body.items[0].quantity, 2);
    assert.equal(findCart.body.items[1].quantity, 1);
    params.body = JSON.stringify(params.body)
    const updateCart = await addToCart(params);
    updateCart.body = JSON.parse(updateCart.body);
    assert(updateCart.body);
    assert.equal(updateCart.body.items.length, 2);
    assert.equal(updateCart.body.items[0].quantity, 4);
    assert.equal(updateCart.body.items[1].quantity, 2);
  });
});
