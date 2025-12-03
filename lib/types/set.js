'use strict';

const MongooseError = require('../error/mongooseError');
const getConstructorName = require('../helpers/getConstructorName');
const util = require('util');
const isBsonType = require('../helpers/isBsonType');

/*!
 * ignore
 */

class MongooseSet extends Set {
  constructor(v, path, doc, schemaType, options) {
    super();
    this.$__parent = doc != null && doc.$__ != null ? doc : null;
    this.$__path = path;
    this.$__schemaType = schemaType;

    if (v != null) {
      if (v instanceof Set || Array.isArray(v)) {
        for (const val of v) {
          this.add(val);
        }
      } else {
        this.add(v);
      }
    }
  }

  /**
   * Overwrites native Set's `add()` function to support Mongoose getters/setters and change tracking.
   *
   * @api public
   * @method add
   * @memberOf Set
   */

  add(value) {
    if (this.$__schemaType == null) {
      super.add(value);
      return this;
    }

    // Cast the value
    try {
      if (this.$__schemaType.$isSchemaSet) {
        value = this.$__schemaType.getEmbeddedSchemaType().cast(value, this.$__parent);
      }
    } catch (error) {
      if (this.$__parent != null) {
        this.$__parent.invalidate(this.$__path, error);
        return this;
      }
      throw error;
    }

    super.add(value);

    if (this.$__parent != null) {
      this.$__parent.markModified(this.$__path);
    }

    return this;
  }

  /**
   * Overwrites native Set's `delete()` function to support change tracking.
   *
   * @api public
   * @method delete
   * @memberOf Set
   */

  delete(value) {
    const res = super.delete(value);
    if (res && this.$__parent != null) {
      this.$__parent.markModified(this.$__path);
    }
    return res;
  }

  /**
   * Overwrites native Set's `clear()` function to support change tracking.
   *
   * @api public
   * @method clear
   * @memberOf Set
   */

  clear() {
    super.clear();
    if (this.$__parent != null) {
      this.$__parent.markModified(this.$__path);
    }
  }

  /**
   * Converts this set to a native JavaScript Array so the MongoDB driver can serialize it.
   *
   * @api public
   * @method toBSON
   * @memberOf Set
   */

  toBSON() {
    return Array.from(this);
  }

  /**
   * Converts this set to a native JavaScript Array for `JSON.stringify()`.
   *
   * @api public
   * @method toJSON
   * @memberOf Set
   */

  toJSON() {
    return Array.from(this);
  }

  /**
   * Converts this set to a native JavaScript Array for `doc.toObject()`.
   *
   * @api public
   * @method toObject
   * @memberOf Set
   */

  toObject(options) {
    if (options && options.flattenSets === false) {
      return new Set(this);
    }

    return Array.from(this).map(val => {
      return val && typeof val.toObject === 'function' ? val.toObject(options) : val;
    });
  }

  inspect() {
    return new Set(this);
  }
}

if (util.inspect.custom) {
  Object.defineProperty(MongooseSet.prototype, util.inspect.custom, {
    enumerable: false,
    writable: false,
    configurable: false,
    value: MongooseSet.prototype.inspect
  });
}

Object.defineProperty(MongooseSet.prototype, '$__parent', {
  enumerable: false,
  writable: true,
  configurable: false
});

Object.defineProperty(MongooseSet.prototype, '$__path', {
  enumerable: false,
  writable: true,
  configurable: false
});

Object.defineProperty(MongooseSet.prototype, '$__schemaType', {
  enumerable: false,
  writable: true,
  configurable: false
});

/**
 * Set to `true` for all Mongoose set instances
 *
 * @api public
 * @property $isMongooseSet
 * @memberOf MongooseSet
 * @instance
 */

Object.defineProperty(MongooseSet.prototype, '$isMongooseSet', {
  enumerable: false,
  writable: false,
  configurable: false,
  value: true
});

module.exports = MongooseSet;
