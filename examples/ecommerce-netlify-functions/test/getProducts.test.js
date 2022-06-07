'use strict';

const { describe, it, before, after } = require('mocha');
const assert = require('assert');
const { handler: getProducts } = require('../functions/getProducts');
const mongoose = require('mongoose');

describe('Products', function() {
  before(async() => {
    await mongoose.connect('mongodb://localhost:27017/netlify');
  });

  after(async() => {
    await mongoose.disconnect();
  });

  it('Should get all products.', async function() {
    const result = await getProducts();
    console.log(result);
    assert(result);
  });
});