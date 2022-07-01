const { Product } = require('../../models');

module.exports = async function createProducts(params) {
    const products = await Product.create(params.product);

    return { products };
};