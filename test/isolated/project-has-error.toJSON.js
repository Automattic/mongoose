'use strict';
Object.defineProperty(Error.prototype, 'toJSON', {
  enumerable: false,
  configurable: false,
  writable: false,
  value: () => ({ from: 'Error' })
});

require('../../');
