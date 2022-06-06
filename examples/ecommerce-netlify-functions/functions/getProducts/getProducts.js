'use strict';

const { Product } = require('../../models');

const handler = async(event) => {
  try {
    const Products = await Product.find();
    return { statusCode: 200, body: Products };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };