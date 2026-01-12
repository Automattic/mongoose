'use strict';

const Decimal = require('../types/decimal128');
const ObjectId = require('../types/objectid');
const specialProperties = require('./specialProperties');
const isMongooseObject = require('./isMongooseObject');
const getFunctionName = require('./getFunctionName');
const isBsonType = require('./isBsonType');
const isMongooseArray = require('../types/array/isMongooseArray').isMongooseArray;
const isObject = require('./isObject');
const isPOJO = require('./isPOJO');
const symbols = require('./symbols');
const trustedSymbol = require('./query/trusted').trustedSymbol;
const BSON = require('mongodb/lib/bson');

/**
 * Object clone with Mongoose natives support.
 *
 * If options.minimize is true, creates a minimal data object. Empty objects and undefined values will not be cloned. This makes the data payload sent to MongoDB as small as possible.
 *
 * Functions and primitives are never cloned.
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

  if (isBsonType(obj, 'Double')) {
    return new BSON.Double(obj.value);
  }
  if (typeof obj === 'number' || typeof obj === 'string' || typeof obj === 'boolean' || typeof obj === 'bigint') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return cloneArray(obj, options);
  }

  if (isMongooseObject(obj)) {
    if (options) {
      if (options.retainDocuments && obj.$__ != null) {
        const clonedDoc = obj.$clone();
        if (obj.__index != null) {
          clonedDoc.__index = obj.__index;
        }
        if (obj.__parentArray != null) {
          clonedDoc.__parentArray = options.parentArray ?? obj.__parentArray;
        }
        clonedDoc.$__setParent(options.parentDoc ?? obj.$__parent);
        return clonedDoc;
      }
      if (options.retainDocuments && obj.$isMongooseMap) {
        const clonedParent = options.parentDoc ?? obj.$__parent;
        const MongooseMap = obj.constructor;
        const ret = new MongooseMap({}, obj.$__path, clonedParent, obj.$__schemaType);
        for (const [key, value] of obj) {
          ret.$__set(key, clone(value, options));
        }
        return ret;
      }
    }

    if (isPOJO(obj) && obj.$__ != null && obj._doc != null) {
      return obj._doc;
    }

    let ret;
    if (options?.json && typeof obj.toJSON === 'function') {
      ret = obj.toJSON(options);
    } else {
      ret = obj.toObject(options);
    }

    return ret;
  }

  const objConstructor = obj.constructor;

  if (objConstructor) {
    switch (getFunctionName(objConstructor)) {
      case 'Object':
        return cloneObject(obj, options, isArrayChild);
      case 'Date':
        return new objConstructor(+obj);
      case 'RegExp':
        return cloneRegExp(obj);
      default:
        // ignore
        break;
    }
  }

  if (isBsonType(obj, 'ObjectId')) {
    if (options?.flattenObjectIds) {
      return obj.toJSON();
    }
    return new ObjectId(obj.id);
  }

  if (isBsonType(obj, 'Decimal128')) {
    if (options?.flattenDecimals) {
      return obj.toJSON();
    }
    return Decimal.fromString(obj.toString());
  }

  // object created with Object.create(null)
  if (!objConstructor && isObject(obj)) {
    return cloneObject(obj, options, isArrayChild);
  }

  if (typeof obj === 'object' && obj[symbols.schemaTypeSymbol]) {
    return obj.clone();
  }

  // If we're cloning this object to go into a MongoDB command,
  // and there's a `toBSON()` function, assume this object will be
  // stored as a primitive in MongoDB and doesn't need to be cloned.
  if (options?.bson && typeof obj.toBSON === 'function') {
    return obj;
  }

  if (typeof obj.valueOf === 'function') {
    return obj.valueOf();
  }

  return cloneObject(obj, options, isArrayChild);
}
module.exports = clone;

/*!
 * ignore
 */

function cloneObject(obj, options, isArrayChild) {
  const minimize = options?.minimize;
  const omitUndefined = options?.omitUndefined;
  const seen = options?._seen;
  const ret = {};
  let hasKeys;

  if (seen && seen.has(obj)) {
    return seen.get(obj);
  } else if (seen) {
    seen.set(obj, ret);
  }
  if (trustedSymbol in obj && options?.copyTrustedSymbol !== false) {
    ret[trustedSymbol] = obj[trustedSymbol];
  }

  const keys = Object.keys(obj);
  const len = keys.length;

  for (let i = 0; i < len; ++i) {
    const key = keys[i];
    if (specialProperties.has(key)) {
      continue;
    }

    // Don't pass `isArrayChild` down
    const val = clone(obj[key], options, false);

    if ((minimize === false || omitUndefined) && typeof val === 'undefined') {
      delete ret[key];
    } else if (minimize !== true || (typeof val !== 'undefined')) {
      hasKeys || (hasKeys = true);
      ret[key] = val;
    }
  }

  return minimize && !isArrayChild ? hasKeys && ret : ret;
}

function cloneArray(arr, options) {
  let i = 0;
  const len = arr.length;

  let ret = null;
  if (options?.retainDocuments) {
    if (arr.isMongooseDocumentArray) {
      ret = new (arr.$schemaType().schema.base.Types.DocumentArray)([], arr.$path(), arr.$parent(), arr.$schemaType());
    } else if (arr.isMongooseArray) {
      ret = new (arr.$parent().schema.base.Types.Array)([], arr.$path(), arr.$parent(), arr.$schemaType());
    } else {
      ret = new Array(len);
    }
  } else {
    ret = new Array(len);
  }

  arr = isMongooseArray(arr) ? arr.__array : arr;
  if (ret.isMongooseDocumentArray) {
    // Create new options object to avoid mutating the shared options.
    // Subdocs need parentArray to point to their own cloned array.
    options = { ...options, parentArray: ret };
  }
  for (i = 0; i < len; ++i) {
    ret[i] = clone(arr[i], options, true);
  }

  return ret;
}

function cloneRegExp(regexp) {
  const ret = new RegExp(regexp.source, regexp.flags);

  if (ret.lastIndex !== regexp.lastIndex) {
    ret.lastIndex = regexp.lastIndex;
  }
  return ret;
}
