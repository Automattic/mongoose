'use strict';

const { describe, it, before, after } = require('mocha');
const assert = require('assert');
const { handler: addToCart } = require('../netlify/functions/addToCart');
const mongoose = require('mongoose');
const fixtures = require('../test/fixtures');



describe('Add to Cart', function() {
  before(async() => {
    await mongoose.connect('mongodb://localhost:27017/netlify');
    await mongoose.connection.dropDatabase();
  });

  after(async() => {
    await mongoose.disconnect();
  });
  it('Should create a cart and add a product to the cart', async function() {
    const products = await fixtures.createProducts({product: [{ productName: 'A Test Products', productPrice: 500 }, {productName: 'Another Test Product', productPrice: 600 }]})
    .then((res) => res.products);
    const params = {
      body: {
        cartId: null,
        items: [
          { productId: products[0]._id, quantity: 2 },
          { productId: products[1]._id, quantity: 1 }
        ]
      }
    };
    const result = await addToCart(params);
    result.body = JSON.parse(result.body);
    assert(result.body);
    assert(result.body.items.length);
  });
  it('Should find the cart and add to the cart', async function() {
    const products = await fixtures.createProducts({product: [{ productName: 'A Test Products', productPrice: 500 }, {productName: 'Another Test Product', productPrice: 600 }]})
    .then((res) => res.products);
    const cart = await fixtures.createCart({products: null});
    const params = {
      body: {
        cartId: cart._id,
        items: [
          { productId: products[0]._id, quantity: 2 },
          { productId: products[1]._id, quantity: 1 }
        ]
      }
    };
    const findCart = await addToCart(params);
    findCart.body = JSON.parse(findCart.body)
    assert(findCart.body);
    assert.equal(findCart.body.items.length, 2)
  });
});
