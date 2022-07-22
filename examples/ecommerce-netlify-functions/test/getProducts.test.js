'use strict';

const { describe, it, before, after } = require('mocha');
const assert = require('assert');
const { handler: getProducts } = require('../netlify/functions/getProducts');
const fixtures = require('./fixtures');
const mongoose = require('mongoose');

describe('Products', function() {
  it('Should get all products.', async function() {
    await fixtures.createProducts({
      product: [
        { name: 'A Test Products', price: 500 },
        { name: 'Another Test Product', price: 600 }
      ]
    }).then((res) => res.products);
    const result = await getProducts();
    assert(result);
  });
});