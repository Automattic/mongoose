/*!
 * Module dependencies.
 */

'use strict';

const Document = require('../../document');
const mongooseArrayMethods = require('./methods');

const arrayAtomicsSymbol = require('../../helpers/symbols').arrayAtomicsSymbol;
const arrayAtomicsBackupSymbol = require('../../helpers/symbols').arrayAtomicsBackupSymbol;
const arrayParentSymbol = require('../../helpers/symbols').arrayParentSymbol;
const arrayPathSymbol = require('../../helpers/symbols').arrayPathSymbol;
const arraySchemaSymbol = require('../../helpers/symbols').arraySchemaSymbol;

/**
 * Mongoose Array constructor.
 *
 * ####NOTE:
 *
 * _Values always have to be passed to the constructor to initialize, otherwise `MongooseArray#push` will mark the array as modified._
 *
 * @param {Array} values
 * @param {String} path
 * @param {Document} doc parent document
 * @api private
 * @inherits Array
 * @see http://bit.ly/f6CnZU
 */

function MongooseArray(values, path, doc, schematype) {
  const arr = values;

  const internals = {
    [arrayAtomicsSymbol]: {},
    [arrayAtomicsBackupSymbol]: void 0,
    [arrayPathSymbol]: path,
    [arraySchemaSymbol]: schematype,
    [arrayParentSymbol]: void 0,
    isMongooseArray: true,
    isMongooseArrayProxy: true,
    __array: arr
  };

  if (values[arrayAtomicsSymbol] != null) {
    internals[arrayAtomicsSymbol] = values[arrayAtomicsSymbol];
  }

  // Because doc comes from the context of another function, doc === global
  // can happen if there was a null somewhere up the chain (see #3020)
  // RB Jun 17, 2015 updated to check for presence of expected paths instead
  // to make more proof against unusual node environments
  if (doc != null && doc instanceof Document) {
    internals[arrayParentSymbol] = doc;
    internals[arraySchemaSymbol] = schematype || doc.schema.path(path);
  }

  const proxy = new Proxy(arr, {
    get: function(target, prop) {
      if (internals.hasOwnProperty(prop)) {
        return internals[prop];
      }
      if (mongooseArrayMethods.hasOwnProperty(prop)) {
        return mongooseArrayMethods[prop];
      }

      return arr[prop];
    },
    set: function(target, prop, val) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        const value = mongooseArrayMethods._cast.call(proxy, val, prop);
        arr[prop] = value;
        mongooseArrayMethods._markModified.call(proxy, prop);
      } else if (internals.hasOwnProperty(prop)) {
        internals[prop] = val;
      } else {
        arr[prop] = val;
      }

      return true;
    }
  });

  return proxy;
}

/*!
 * Module exports.
 */

module.exports = exports = MongooseArray;
