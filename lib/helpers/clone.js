'use strict';


const cloneRegExp = require('regexp-clone');
const Decimal = require('../types/decimal128');
const ObjectId = require('../types/objectid');
const specialProperties = require('./specialProperties');
const isMongooseObject = require('./isMongooseObject');
const getFunctionName = require('./getFunctionName');
const isBsonType = require('./isBsonType');
const isObject = require('./isObject');
const symbols = require('./symbols');
const trustedSymbol = require('./query/trusted').trustedSymbol;
const utils = require('../utils');


/*!
 * Object clone with Mongoose natives support.
 *
 * If options.minimize is true, creates a minimal data object. Empty objects and undefined values will not be cloned. This makes the data payload sent to MongoDB as small as possible.
 *
 * Functions are never cloned.
 *
 * @param {Object} obj the object to clone
 * @param {Object} options
 * @param {Boolean} isArrayChild true if cloning immediately underneath an array. Special case for minimize.
 * @return {Object} the cloned object
 * @api private
 */

function clone(obj, options, isArrayChild) {
  if (obj == null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return cloneArray(obj, options);
  }

  if (isMongooseObject(obj)) {
    // Single nested subdocs should apply getters later in `applyGetters()`
    // when calling `toObject()`. See gh-7442, gh-8295
    if (options && options._skipSingleNestedGetters && obj.$isSingleNested) {
      options = Object.assign({}, options, { getters: false });
    }

    if (utils.isPOJO(obj) && obj.$__ != null && obj._doc != null) {
      return obj._doc;
    }

    if (options && options.json && typeof obj.toJSON === 'function') {
      return obj.toJSON(options);
    }
    return obj.toObject(options);
  }

  if (obj.constructor) {
    switch (getFunctionName(obj.constructor)) {
      case 'Object':
        return cloneObject(obj, options, isArrayChild);
      case 'Date':
        return new obj.constructor(+obj);
      case 'RegExp':
        return cloneRegExp(obj);
      default:
        // ignore
        break;
    }
  }

  if (obj instanceof ObjectId) {
    return new ObjectId(obj.id);
  }

  if (isBsonType(obj, 'Decimal128')) {
    if (options && options.flattenDecimals) {
      return obj.toJSON();
    }
    return Decimal.fromString(obj.toString());
  }

  if (!obj.constructor && isObject(obj)) {
    // object created with Object.create(null)
    return cloneObject(obj, options, isArrayChild);
  }

  if (obj[symbols.schemaTypeSymbol]) {
    return obj.clone();
  }

  // If we're cloning this object to go into a MongoDB command,
  // and there's a `toBSON()` function, assume this object will be
  // stored as a primitive in MongoDB and doesn't need to be cloned.
  if (options && options.bson && typeof obj.toBSON === 'function') {
    return obj;
  }

  if (obj.valueOf != null) {
    return obj.valueOf();
  }

  return cloneObject(obj, options, isArrayChild);
}
module.exports = clone;

/*!
 * ignore
 */

function cloneObject(obj, options, isArrayChild) {
  const minimize = options && options.minimize;
  const ret = {};
  let hasKeys;

  if (obj[trustedSymbol]) {
    ret[trustedSymbol] = obj[trustedSymbol];
  }

  for (const k of Object.keys(obj)) {
    if (specialProperties.has(k)) {
      continue;
    }

    // Don't pass `isArrayChild` down
    const val = clone(obj[k], options);

    if (!minimize || (typeof val !== 'undefined')) {
      if (minimize === false && typeof val === 'undefined') {
        delete ret[k];
      } else {
        hasKeys || (hasKeys = true);
        ret[k] = val;
      }
    }
  }

  return minimize && !isArrayChild ? hasKeys && ret : ret;
}

function cloneArray(arr, options) {
  const ret = [];

  for (const item of arr) {
    ret.push(clone(item, options, true));
  }

  return ret;
}