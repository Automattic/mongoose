'use strict';

const { describe, it, before, after } = require('mocha');
const assert = require('assert');
const { handler: addToCart } = require('../functions/addToCart');
const { handler: checkout } = require('../functions/checkout');
const mongoose = require('mongoose');
const fixtures = require('./fixtures');
const sinon = require('sinon');
const config = require('../.config');
const stripe = require('stripe')(config.stripeSecretKey);

describe('Checkout', function() {
  before(async() => {
    await mongoose.connect('mongodb://localhost:27017/netlify');
    await mongoose.connection.dropDatabase();
  });

  after(async() => {
    await mongoose.disconnect();
  });
  it('Should do a successful checkout run', async function() {
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
    assert(result.body);
    assert(result.body.items.length);
    params.body.cartId = result.body._id;
    const stub = sinon.stub(stripe, 'paymentIntents').returns({status: 'succeeded', id: '123', brand: 'visa', last4: '1234'});
    sinon.stub(stripe, 'paymentMethods').returns({status: 'succeeded', id: '123', brand: 'visa', last4: '1234'});
    sinon.stub(stripe, 'checkout').returns({status: 'succeeded', id: '123', brand: 'visa', last4: '1234'});
    // stub.callsFake(() => Promise.resolve({status: 'succeeded', id: '123', brand: 'visa', last4: '1234'}));
    // const stub = sinon.createStubInstance(stripe);
    // stub.paymentIntents.retrieve.returns({status: '200'})
    const finish = await checkout(params);
    console.log(finish);
    assert(finish.body.order);
    assert(finish.body.cart);
  });
});
