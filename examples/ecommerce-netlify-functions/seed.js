'use strict';
const mongoose = require('mongoose');
const { Product } = require('./models');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/netlify');
  await mongoose.connection.dropDatabase();

  await Product.create({
    productName: 'Netlify\'s First Flight',
    productPrice: 2000,
    quantity: 5
  });

  await Product.create({
    productName: 'Netlify The Movie',
    productPrice: 4000,
    quantity: 5
  });

  await Product.create({
    productName: 'Netlify vs The Internet',
    productPrice: 6000,
    quantity: 5
  });

  await Product.create({
    productName: 'Netlify and The Wasp',
    productPrice: 8000,
    quantity: 5
  });
  console.log('done');
}

run();