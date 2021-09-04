'use strict';

const Mixed = require('../schema/mixed');
const ObjectId = require('./objectid');
const clone = require('../helpers/clone');
const deepEqual = require('../utils').deepEqual;
const get = require('../helpers/get');
const getConstructorName = require('../helpers/getConstructorName');
const handleSpreadDoc = require('../helpers/document/handleSpreadDoc');
const util = require('util');
const specialProperties = require('../helpers/specialProperties');

const populateModelSymbol = require('../helpers/symbols').populateModelSymbol;

/*!
 * ignore
 */

class MongooseMap extends Map {
  constructor(v, path, doc, schemaType) {
    if (getConstructorName(v) === 'Object') {
      v = Object.keys(v).reduce((arr, key) => arr.concat([[key, v[key]]]), []);
    }
    super(v);
    this.$__parent = doc != null && doc.$__ != null ? doc : null;
    this.$__path = path;
    this.$__schemaType = schemaType == null ? new Mixed(path) : schemaType;

    this.$__runDeferred();
  }

  $init(key, value) {
    checkValidKey(key);

    super.set(key, value);

    if (value != null && value.$isSingleNested) {
      value.$basePath = this.$__path + '.' + key;
    }
  }

  $__set(key, value) {
    super.set(key, value);
  }

  get(key, options) {
    if (key instanceof ObjectId) {
      key = key.toString();
    }

    options = options || {};
    if (options.getters === false) {
      return super.get(key);
    }
    return this.$__schemaType.applyGetters(super.get(key), this.$__parent);
  }

  set(key, value) {
    if (key instanceof ObjectId) {
      key = key.toString();
    }

    checkValidKey(key);
    value = handleSpreadDoc(value);

    // Weird, but because you can't assign to `this` before calling `super()`
    // you can't get access to `$__schemaType` to cast in the initial call to
    // `set()` from the `super()` constructor.

    if (this.$__schemaType == null) {
      this.$__deferred = this.$__deferred || [];
      this.$__deferred.push({ key: key, value: value });
      return;
    }

    const fullPath = this.$__path + '.' + key;
    const populated = this.$__parent != null && this.$__parent.$__ ?
      this.$__parent.$populated(fullPath) || this.$__parent.$populated(this.$__path) :
      null;
    const priorVal = this.get(key);

    if (populated != null) {
      if (value.$__ == null) {
        value = new populated.options[populateModelSymbol](value);
      }
      value.$__.wasPopulated = true;
    } else {
      try {
        value = this.$__schemaType.
          applySetters(value, this.$__parent, false, this.get(key), { path: fullPath });
      } catch (error) {
        if (this.$__parent != null && this.$__parent.$__ != null) {
          this.$__parent.invalidate(fullPath, error);
          return;
        }
        throw error;
      }
    }

    super.set(key, value);

    if (value != null && value.$isSingleNested) {
      value.$basePath = this.$__path + '.' + key;
    }

    const parent = this.$__parent;
    if (parent != null && parent.$__ != null && !deepEqual(value, priorVal)) {
      parent.markModified(this.$__path + '.' + key);
    }
  }

  clear() {
    super.clear();
    const parent = this.$__parent;
    if (parent != null) {
      parent.markModified(this.$__path);
    }
  }

  delete(key) {
    if (key instanceof ObjectId) {
      key = key.toString();
    }

    this.set(key, undefined);
    super.delete(key);
  }

  toBSON() {
    return new Map(this);
  }

  toObject(options) {
    if (get(options, 'flattenMaps')) {
      const ret = {};
      const keys = this.keys();
      for (const key of keys) {
        ret[key] = clone(this.get(key), options);
      }
      return ret;
    }

    return new Map(this);
  }

  $toObject() {
    return this.constructor.prototype.toObject.apply(this, arguments);
  }

  toJSON() {
    const ret = {};
    const keys = this.keys();
    for (const key of keys) {
      ret[key] = this.get(key);
    }
    return ret;
  }

  inspect() {
    return new Map(this);
  }

  $__runDeferred() {
    if (!this.$__deferred) {
      return;
    }

    for (const keyValueObject of this.$__deferred) {
      this.set(keyValueObject.key, keyValueObject.value);
    }

    this.$__deferred = null;
  }
}

if (util.inspect.custom) {
  Object.defineProperty(MongooseMap.prototype, util.inspect.custom, {
    enumerable: false,
    writable: false,
    configurable: false,
    value: MongooseMap.prototype.inspect
  });
}

Object.defineProperty(MongooseMap.prototype, '$__set', {
  enumerable: false,
  writable: true,
  configurable: false
});

Object.defineProperty(MongooseMap.prototype, '$__parent', {
  enumerable: false,
  writable: true,
  configurable: false
});

Object.defineProperty(MongooseMap.prototype, '$__path', {
  enumerable: false,
  writable: true,
  configurable: false
});

Object.defineProperty(MongooseMap.prototype, '$__schemaType', {
  enumerable: false,
  writable: true,
  configurable: false
});

Object.defineProperty(MongooseMap.prototype, '$isMongooseMap', {
  enumerable: false,
  writable: false,
  configurable: false,
  value: true
});

Object.defineProperty(MongooseMap.prototype, '$__deferredCalls', {
  enumerable: false,
  writable: false,
  configurable: false,
  value: true
});

/*!
 * Since maps are stored as objects under the hood, keys must be strings
 * and can't contain any invalid characters
 */

function checkValidKey(key) {
  const keyType = typeof key;
  if (keyType !== 'string') {
    throw new TypeError(`Mongoose maps only support string keys, got ${keyType}`);
  }
  if (key.startsWith('$')) {
    throw new Error(`Mongoose maps do not support keys that start with "$", got "${key}"`);
  }
  if (key.includes('.')) {
    throw new Error(`Mongoose maps do not support keys that contain ".", got "${key}"`);
  }
  if (specialProperties.has(key)) {
    throw new Error(`Mongoose maps do not support reserved key name "${key}"`);
  }
}

module.exports = MongooseMap;
