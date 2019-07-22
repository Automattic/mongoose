'use strict';

const { clearCache } = require('../services/cache');

module.exports = async function(req, res, next) {
  await next(); // call endpoint
  console.log(req.userId);
  clearCache(req.userId);
};
