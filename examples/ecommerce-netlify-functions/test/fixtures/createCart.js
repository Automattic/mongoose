const {Cart} = require('../../models');


module.exports = async function createCart(params) {
    const cart = await Cart.create({products: [params.products]});
    return { cart };
}