'use strict';

const { Product } = require('../models');

const handler = async(event) => {
  try {
    const products = await Product.find();
    return { statusCode: 200, body: products };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};

module.exports = { handler };