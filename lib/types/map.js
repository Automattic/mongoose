'use strict';

/*!
 * ignore
 */

class MongooseMap extends Map {
  constructor(v, path, doc, schemaType) {
    if (v != null && v.constructor.name === 'Object') {
      v = Object.keys(v).reduce((arr, key) => arr.concat([[key, v[key]]]), []);
    }
    super(v);

    this.$__parent = doc;
    this.$__path = path;
    this.$__schemaType = schemaType;

    this.$__runDeferred();
  }

  $init(key, value) {
    if (key.startsWith('$')) {
      throw new Error('Mongoose maps do not support keys that start with ' +
        '`$`, got "' + key + '"');
    }
    if (key.indexOf('.') !== -1) {
      throw new Error('Mongoose maps do not support keys that contain `.`, ' +
        'got "' + key + '"');
    }

    super.set(key, value);

    if (value != null && value.$isSingleNested) {
      value.$basePath = this.$__path + '.' + key;
    }
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
      this.$__parent.populated(fullPath) || this.$__parent.populated(this.$__path) :
      null;

    if (populated != null) {
      if (value.$__ == null) {
        value = new populated.options.model(value);
      }
      value.$__.wasPopulated = true;
    } else {
      try {
        value = this.$__schemaType.
          applySetters(value, this.$__parent, false, this.get(key));
      } catch (error) {
        this.$__parent.invalidate(fullPath, error);
        return;
      }
    }

    super.set(key, value);

    if (value != null && value.$isSingleNested) {
      value.$basePath = this.$__path + '.' + key;
    }

    if (this.$__parent != null && this.$__parent.$__) {
      this.$__parent.markModified(this.$__path + '.' + key);
    }
  }

  toBSON() {
    return new Map(this);
  }

  toJSON() {
    let ret = {};
    const keys = this.keys();
    for (let key of keys) {
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
    for (let i = 0; i < this.$__deferred.length; ++i) {
      this.set(this.$__deferred[i].key, this.$__deferred[i].value);
    }
    this.$__deferred = null;
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

module.exports = MongooseMap;
