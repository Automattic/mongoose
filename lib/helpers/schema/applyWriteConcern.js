'use strict';

const get = require('../get');

module.exports = function applyWriteConcern(schema, options) {
  // const writeConcern = Object.keys(options).length ? options : get(schema, 'options.writeConcern', {});
  const writeConcern = get(schema, 'options.writeConcern', {});
  console.log('what is options after', options)
  if (Object.keys(writeConcern).length != 0) {
    options.writeConcern = {};
    if (!('w' in options) && writeConcern.w != null) {
      options.writeConcern.w = writeConcern.w;
    }
    if (!('j' in options) && writeConcern.j != null) {
      options.writeConcern.j = writeConcern.j;
    }
    if (!('wtimeout' in options) && writeConcern.wtimeout != null) {
      options.writeConcern.wtimeout = writeConcern.wtimeout;
    }
  }
  else {
    if (!('w' in options) && writeConcern.w != null) {
      options.w = writeConcern.w;
    }
    if (!('j' in options) && writeConcern.j != null) {
      options.j = writeConcern.j;
    }
    if (!('wtimeout' in options) && writeConcern.wtimeout != null) {
      options.wtimeout = writeConcern.wtimeout;
    }
  }
  console.log('what is options after the if else chain', options);
};
