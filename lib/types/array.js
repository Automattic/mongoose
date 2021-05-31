/*!
 * Module dependencies.
 */

'use strict';

const CoreMongooseArray = require('./core_array');
const Document = require('../document');

const arrayAtomicsSymbol = require('../helpers/symbols').arrayAtomicsSymbol;
const arrayParentSymbol = require('../helpers/symbols').arrayParentSymbol;
const arrayPathSymbol = require('../helpers/symbols').arrayPathSymbol;
const arraySchemaSymbol = require('../helpers/symbols').arraySchemaSymbol;

const _basePush = Array.prototype.push;

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
  let arr;

  if (Array.isArray(values)) {
    const len = values.length;

    // Perf optimizations for small arrays: much faster to use `...` than `for` + `push`,
    // but large arrays may cause stack overflows. And for arrays of length 0/1, just
    // modifying the array is faster. Seems small, but adds up when you have a document
    // with thousands of nested arrays.
    if (len === 0) {
      arr = new CoreMongooseArray();
    } else if (len === 1) {
      arr = new CoreMongooseArray(1);
      arr[0] = values[0];
    } else if (len < 10000) {
      arr = new CoreMongooseArray();
      _basePush.apply(arr, values);
    } else {
      arr = new CoreMongooseArray();
      for (let i = 0; i < len; ++i) {
        _basePush.call(arr, values[i]);
      }
    }

    if (values[arrayAtomicsSymbol] != null) {
      arr[arrayAtomicsSymbol] = values[arrayAtomicsSymbol];
    } else {
      arr[arrayAtomicsSymbol] = {};
    }
  } else {
    arr = new CoreMongooseArray();
    arr[arrayAtomicsSymbol] = {};
  }

  arr[arrayPathSymbol] = path;
  arr[arraySchemaSymbol] = void 0;

  // Because doc comes from the context of another function, doc === global
  // can happen if there was a null somewhere up the chain (see #3020)
  // RB Jun 17, 2015 updated to check for presence of expected paths instead
  // to make more proof against unusual node environments
  if (doc && doc instanceof Document) {
    arr[arrayParentSymbol] = doc;
    arr[arraySchemaSymbol] = schematype || doc.schema.path(path);
  }

  return arr;
}

/*!
 * Module exports.
 */

module.exports = exports = MongooseArray;
