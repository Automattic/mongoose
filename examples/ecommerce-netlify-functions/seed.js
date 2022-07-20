'use strict';

const { Product } = require('./models');
const config = require('./.config');
const mongoose = require('mongoose');

async function createProducts() {
  await mongoose.connect(config.mongodbUri);
  await mongoose.connection.dropDatabase();

  await Product.create({
    name: 'iPhone 12',
    price: 500,
    image: 'https://images.unsplash.com/photo-1611472173362-3f53dbd65d80'
  });

  await Product.create({
    name: 'iPhone SE',
    price: 600,
    image: 'https://images.unsplash.com/photo-1529618160092-2f8ccc8e087b'
  });

  await Product.create({
    name: 'iPhone 12 Pro',
    price: 700,
    image: 'https://images.unsplash.com/photo-1603921326210-6edd2d60ca68'
  });

  await Product.create({
    name: 'iPhone 11',
    price: 800,
    image: 'https://images.unsplash.com/photo-1574755393849-623942496936'
  });

  console.log('done');
  process.exit(0);
}

createProducts();