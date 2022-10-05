'use strict';

const utils = require('../utils');

if (typeof jest !== 'undefined' && typeof window !== 'undefined') {
  utils.warn('Mongoose: looks like you\'re trying to test a Mongoose app ' +
    'with Jest\'s default jsdom test environment. Please make sure you read ' +
    'Mongoose\'s docs on configuring Jest to test Node.js apps: ' +
    'https://mongoosejs.com/docs/jest.html');
}

if (typeof jest !== 'undefined' && setTimeout.clock != null && typeof setTimeout.clock.Date === 'function') {
  utils.warn('Mongoose: looks like you\'re trying to test a Mongoose app ' +
    'with Jest\'s mock timers enabled. Please make sure you read ' +
    'Mongoose\'s docs on configuring Jest to test Node.js apps: ' +
    'https://mongoosejs.com/docs/jest.html');
}
