'use strict';

const { Product } = require('./models');
const config = require('./.config');
const mongoose = require('mongoose');

async function createProducts() {
  await mongoose.connect(config.mongodbUri);

  await Product.create({
    productName: 'Dummy Product',
    productPrice: 500
  });

  await Product.create({
    productName: 'Another Dummy Product',
    productPrice: 600
  });

  console.log('done');
  process.exit(0);
}

createProducts();