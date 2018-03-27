'use strict';

/*!
 * ignore
 */

class MongooseMap extends Map {
  constructor(v, path, doc) {
    if (v != null && v.constructor.name === 'Object') {
      v = Object.keys(v).reduce((arr, key) => arr.concat([[key, v[key]]]), []);
    }
    super(v);

    this.$__parent = doc;
    this.$__path = path;
    this.$isMongooseMap = true;
  }

  set(key, value) {
    if (key.startsWith('$')) {
      throw new Error('Mongoose maps do not support keys that start with ' +
        '`$`, got "' + key + '"');
    }
    if (key.indexOf('.') !== -1) {
      throw new Error('Mongoose maps do not support keys that contain `.`, ' +
        'got "' + key + '"');
    }
    super.set(key, value);

    if (this.$__parent != null) {
      this.$__parent.markModified(this.$__path + '.' + key);
    }
  }

  toBSON() {
    return new Map(this);
  }

  toJSON() {
    return new Map(this);
  }

  inspect() {
    return new Map(this);
  }
}

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

module.exports = MongooseMap;
