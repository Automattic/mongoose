'use strict';

if (typeof jest !== 'undefined') {
  console.warn('Mongoose: looks like you\'re trying to test a Mongoose app ' +
    'with Jest. We strongly advise using a different test runner. If you ' +
    'must use Jest, please make sure you read http://mongoosejs.com/docs/jest.html');
}