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
  const arr = new CoreMongooseArray();
  arr[arrayAtomicsSymbol] = {};

  if (Array.isArray(values)) {
    const len = values.length;
    for (let i = 0; i < len; ++i) {
      _basePush.call(arr, values[i]);
    }

    if (values[arrayAtomicsSymbol] != null) {
      arr[arrayAtomicsSymbol] = values[arrayAtomicsSymbol];
    }
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
