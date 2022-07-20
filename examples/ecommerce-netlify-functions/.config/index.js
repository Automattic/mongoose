'use strict';

if (process.env.NODE_ENV) {
  try {
    module.exports = require('./' + process.env.NODE_ENV);
    console.log('Using ' + process.env.NODE_ENV);
  } catch (err) {
    module.exports = require('./development');
  }
} else {
  console.log('using production');
  module.exports = require('./production');
}