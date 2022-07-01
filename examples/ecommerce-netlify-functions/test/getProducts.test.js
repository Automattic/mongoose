'use strict';

const { describe, it, before, after } = require('mocha');
const assert = require('assert');
const { handler: getProducts } = require('../functions/getProducts');
const fixtures = require('./fixtures');
const mongoose = require('mongoose');

describe('Products', function() {
  before(async() => {
    await mongoose.connect('mongodb://localhost:27017/netlify');
    await mongoose.connection.dropDatabase();
  });

  after(async() => {
    await mongoose.disconnect();
  });

  it('Should get all products.', async function() {
    await fixtures.createProducts({product: [{ productName: 'A Test Products', productPrice: 500 }, {productName: 'Another Test Product', productPrice: 600 }]})
    .then((res) => res.products);
    const result = await getProducts();
    assert(result);
  });
});