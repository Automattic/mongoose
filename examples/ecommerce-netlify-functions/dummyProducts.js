const { Product } = require('./models');
const mongoose = require('mongoose');

async function createProducts() {
    await mongoose.connect('mongodb://localhost:27017/netlify');

    await Product.create({
        productName: 'Dummy Product',
        productPrice: 500
    });

    await Product.create({
        productName: 'Another Dummy Product',
        productPrice: 600
    });

    console.log('done');
}

createProducts();