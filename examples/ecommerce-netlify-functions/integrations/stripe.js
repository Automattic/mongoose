'use strict';

const config = require('../.config');

module.exports = require('stripe')(config.stripeSecretKey);
