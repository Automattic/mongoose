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
  }

  set(key, value) {
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
