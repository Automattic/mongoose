'use strict';

const Mixed = require('../schema/mixed');
const clone = require('../helpers/clone');
const deepEqual = require('../utils').deepEqual;

const notFound = Symbol('mongoose#Set#notFound');

/*!
 * ignore
 */

class MongooseSet extends Set {
  constructor(v, path, doc, schemaType) {
    super();
    this.$__parent = doc?.$__ != null ? doc : null;
    this.$__path = path;
    this.$__schemaType = schemaType == null ? new Mixed(path) : schemaType;

    if (v != null) {
      for (const value of v) {
        this.$__add(this.$__cast(value));
      }
    }
  }

  $init(value) {
    this.$__add(value);
  }

  $__add(value) {
    if (findExisting(this, value) === notFound) {
      super.add(value);
    }
  }

  $__cast(value) {
    return this.$__schemaType.applySetters(value, this.$__parent, false);
  }

  /**
   * Overwrites native Set's `add()` function to support casting, deduplication
   * of ObjectIds, Dates, and other non-primitive values, and change tracking.
   *
   * #### Example:
   *
   *     const schema = new Schema({ tags: { type: Set, of: String } });
   *     const doc = new Model({ tags: ['a'] });
   *     doc.tags.add('b'); // doc.tags is now `Set { 'a', 'b' }`
   *     doc.tags.add('a'); // no-op, 'a' is already in the set
   *
   * @api public
   * @method add
   * @memberOf Set
   */

  add(value) {
    try {
      value = this.$__cast(value);
    } catch (error) {
      if (this.$__parent != null) {
        this.$__parent.invalidate(this.$__path, error);
        return this;
      }
      throw error;
    }

    if (findExisting(this, value) !== notFound) {
      return this;
    }

    super.add(value);
    if (this.$__parent != null) {
      this.$__parent.markModified(this.$__path);
    }
    return this;
  }

  /**
   * Overwrites native Set's `has()` function to cast `value` and compare
   * non-primitive values like ObjectIds by value rather than by reference.
   *
   * @api public
   * @method has
   * @memberOf Set
   */

  has(value) {
    try {
      value = this.$__cast(value);
    } catch {
      return false;
    }
    return findExisting(this, value) !== notFound;
  }

  /**
   * Overwrites native Set's `delete()` function to support casting and change tracking.
   *
   * @api public
   * @method delete
   * @memberOf Set
   */

  delete(value) {
    try {
      value = this.$__cast(value);
    } catch {
      return false;
    }

    const existing = findExisting(this, value);
    if (existing === notFound) {
      return false;
    }

    super.delete(existing);
    if (this.$__parent != null) {
      this.$__parent.markModified(this.$__path);
    }
    return true;
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
   * Converts this set to an array so the MongoDB driver can serialize it.
   *
   * @api public
   * @method toBSON
   * @memberOf Set
   */

  toBSON() {
    return Array.from(this);
  }

  /**
   * Converts this set to an array, which is how sets are stored in MongoDB.
   *
   * @param {object} [options]
   * @api public
   * @method toObject
   * @memberOf Set
   */

  toObject(options) {
    return Array.from(this, value => clone(value, options));
  }

  /**
   * Converts this set to an array for `JSON.stringify()`, because
   * `JSON.stringify()` converts native sets to empty objects.
   *
   * @param {object} [options]
   * @api public
   * @method toJSON
   * @memberOf Set
   */

  toJSON(options) {
    return Array.from(this, value => clone(value, { ...options, json: true }));
  }
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

/*!
 * Native sets compare objects by reference, so two ObjectIds with the same
 * value would both be stored. Fall back to `deepEqual()` for objects.
 */

function findExisting(set, value) {
  if (value == null || typeof value !== 'object') {
    return Set.prototype.has.call(set, value) ? value : notFound;
  }
  for (const existing of Set.prototype.values.call(set)) {
    if (deepEqual(existing, value)) {
      return existing;
    }
  }
  return notFound;
}

module.exports = MongooseSet;
