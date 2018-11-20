'use strict';

if (typeof jest !== 'undefined' && typeof window !== 'undefined') {
  console.warn('Mongoose: looks like you\'re trying to test a Mongoose app ' +
    'with Jest\'s default jsdom test environment. Please make sure you read ' +
    'Mongoose\'s docs on configuring Jest to test Node.js apps: ' +
    'http://mongoosejs.com/docs/jest.html');
}