/*!
 * Module dependencies.
 */

'use strict';

const CoreMongooseArray = require('../core_array');
const Document = require('../../document');

const arrayAtomicsSymbol = require('../../helpers/symbols').arrayAtomicsSymbol;
const arrayAtomicsBackupSymbol = require('../../helpers/symbols').arrayAtomicsBackupSymbol;
const arrayParentSymbol = require('../../helpers/symbols').arrayParentSymbol;
const arrayPathSymbol = require('../../helpers/symbols').arrayPathSymbol;
const arraySchemaSymbol = require('../../helpers/symbols').arraySchemaSymbol;

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
  const arr = [];

  const internals = {
    [arrayAtomicsSymbol]: {},
    [arrayAtomicsBackupSymbol]: void 0,
    [arrayPathSymbol]: path,
    [arraySchemaSymbol]: void 0,
    [arrayParentSymbol]: void 0
  };

  if (Array.isArray(values)) {
    const len = values.length;
    for (let i = 0; i < len; ++i) {
      _basePush.call(arr, values[i]);
    }

    if (values[arrayAtomicsSymbol] != null) {
      internals[arrayAtomicsSymbol] = values[arrayAtomicsSymbol];
    }
  }

  internals[arrayPathSymbol] = path;
  internals[arraySchemaSymbol] = void 0;

  // Because doc comes from the context of another function, doc === global
  // can happen if there was a null somewhere up the chain (see #3020)
  // RB Jun 17, 2015 updated to check for presence of expected paths instead
  // to make more proof against unusual node environments
  if (doc && doc instanceof Document) {
    internals[arrayParentSymbol] = doc;
    internals[arraySchemaSymbol] = schematype || doc.schema.path(path);
  }

  const proxy = new Proxy(arr, {
    get: function(target, prop) {
      if (prop === 'isMongooseArray' || prop === 'isMongooseArrayProxy') {
        return true;
      }
      if (prop === '__array') {
        return arr;
      }
      if (prop === 'set') {
        return set;
      }
      if (internals.hasOwnProperty(prop)) {
        return internals[prop];
      }
      if (CoreMongooseArray.prototype.hasOwnProperty(prop)) {
        return CoreMongooseArray.prototype[prop];
      }

      return arr[prop];
    },
    set: function(target, prop, value) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        set.call(proxy, prop, value);
      } else if (internals.hasOwnProperty(prop)) {
        internals[prop] = value;
      } else {
        arr[prop] = value;
      }

      return true;
    }
  });

  return proxy;
}

/*!
 * Used as a method by array instances
 */
function set(i, val, skipModified) {
  const arr = this.__array;
  if (skipModified) {
    arr[i] = val;
    return arr;
  }
  const value = CoreMongooseArray.prototype._cast.call(this, val, i);
  arr[i] = value;
  CoreMongooseArray.prototype._markModified.call(this, i);
  return arr;
}

/*!
 * Module exports.
 */

module.exports = exports = MongooseArray;
