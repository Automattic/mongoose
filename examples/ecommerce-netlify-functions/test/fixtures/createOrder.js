const { Order } = require('../../models');

module.exports = async function createOrder(params) {

  const order = await Order.create(params.order);
  return { order };
};
