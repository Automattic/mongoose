/*!
 * Module dependencies.
 */

var ObjectId = require('./types/objectid');
var cloneRegExp = require('regexp-clone');
var sliced = require('sliced');
var mpath = require('mpath');
var ms = require('ms');
var MongooseBuffer;
var MongooseArray;
var Document;

/*!
 * Produces a collection name from model `name`.
 *
 * @param {String} name a model name
 * @return {String} a collection name
 * @api private
 */

exports.toCollectionName = function(name, options) {
  options = options || {};
  if (name === 'system.profile') {
    return name;
  }
  if (name === 'system.indexes') {
    return name;
  }
  if (options.pluralization === false) {
    return name;
  }
  return pluralize(name.toLowerCase());
};

/**
 * Pluralization rules.
 *
 * These rules are applied while processing the argument to `toCollectionName`.
 *
 * @deprecated remove in 4.x gh-1350
 */

exports.pluralization = [
  [/(m)an$/gi, '$1en'],
  [/(pe)rson$/gi, '$1ople'],
  [/(child)$/gi, '$1ren'],
  [/^(ox)$/gi, '$1en'],
  [/(ax|test)is$/gi, '$1es'],
  [/(octop|vir)us$/gi, '$1i'],
  [/(alias|status)$/gi, '$1es'],
  [/(bu)s$/gi, '$1ses'],
  [/(buffal|tomat|potat)o$/gi, '$1oes'],
  [/([ti])um$/gi, '$1a'],
  [/sis$/gi, 'ses'],
  [/(?:([^f])fe|([lr])f)$/gi, '$1$2ves'],
  [/(hive)$/gi, '$1s'],
  [/([^aeiouy]|qu)y$/gi, '$1ies'],
  [/(x|ch|ss|sh)$/gi, '$1es'],
  [/(matr|vert|ind)ix|ex$/gi, '$1ices'],
  [/([m|l])ouse$/gi, '$1ice'],
  [/(kn|w|l)ife$/gi, '$1ives'],
  [/(quiz)$/gi, '$1zes'],
  [/s$/gi, 's'],
  [/([^a-z])$/, '$1'],
  [/$/gi, 's']
];
var rules = exports.pluralization;

/**
 * Uncountable words.
 *
 * These words are applied while processing the argument to `toCollectionName`.
 * @api public
 */

exports.uncountables = [
  'advice',
  'energy',
  'excretion',
  'digestion',
  'cooperation',
  'health',
  'justice',
  'labour',
  'machinery',
  'equipment',
  'information',
  'pollution',
  'sewage',
  'paper',
  'money',
  'species',
  'series',
  'rain',
  'rice',
  'fish',
  'sheep',
  'moose',
  'deer',
  'news',
  'expertise',
  'status',
  'media'
];
var uncountables = exports.uncountables;

/*!
 * Pluralize function.
 *
 * @author TJ Holowaychuk (extracted from _ext.js_)
 * @param {String} string to pluralize
 * @api private
 */

function pluralize(str) {
  var found;
  if (!~uncountables.indexOf(str.toLowerCase())) {
    found = rules.filter(function(rule) {
      return str.match(rule[0]);
    });
    if (found[0]) {
      return str.replace(found[0][0], found[0][1]);
    }
  }
  return str;
}

/*!
 * Determines if `a` and `b` are deep equal.
 *
 * Modified from node/lib/assert.js
 *
 * @param {any} a a value to compare to `b`
 * @param {any} b a value to compare to `a`
 * @return {Boolean}
 * @api private
 */

exports.deepEqual = function deepEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof ObjectId && b instanceof ObjectId) {
    return a.toString() === b.toString();
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source &&
        a.ignoreCase === b.ignoreCase &&
        a.multiline === b.multiline &&
        a.global === b.global;
  }

  if (typeof a !== 'object' && typeof b !== 'object') {
    return a == b;
  }

  if (a === null || b === null || a === undefined || b === undefined) {
    return false;
  }

  if (a.prototype !== b.prototype) {
    return false;
  }

  // Handle MongooseNumbers
  if (a instanceof Number && b instanceof Number) {
    return a.valueOf() === b.valueOf();
  }

  if (Buffer.isBuffer(a)) {
    return exports.buffer.areEqual(a, b);
  }

  if (isMongooseObject(a)) {
    a = a.toObject();
  }
  if (isMongooseObject(b)) {
    b = b.toObject();
  }

  try {
    var ka = Object.keys(a),
        kb = Object.keys(b),
        key, i;
  } catch (e) {
    // happens when one is a string literal and the other isn't
    return false;
  }

  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length !== kb.length) {
    return false;
  }

  // the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();

  // ~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] !== kb[i]) {
      return false;
    }
  }

  // equivalent values for every corresponding key, and
  // ~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key])) {
      return false;
    }
  }

  return true;
};

/*!
 * Object clone with Mongoose natives support.
 *
 * If options.minimize is true, creates a minimal data object. Empty objects and undefined values will not be cloned. This makes the data payload sent to MongoDB as small as possible.
 *
 * Functions are never cloned.
 *
 * @param {Object} obj the object to clone
 * @param {Object} options
 * @return {Object} the cloned object
 * @api private
 */

exports.clone = function clone(obj, options) {
  if (obj === undefined || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return cloneArray(obj, options);
  }

  if (isMongooseObject(obj)) {
    if (options && options.json && typeof obj.toJSON === 'function') {
      return obj.toJSON(options);
    }
    return obj.toObject(options);
  }

  if (obj.constructor) {
    switch (exports.getFunctionName(obj.constructor)) {
      case 'Object':
        return cloneObject(obj, options);
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

  if (!obj.constructor && exports.isObject(obj)) {
    // object created with Object.create(null)
    return cloneObject(obj, options);
  }

  if (obj.valueOf) {
    return obj.valueOf();
  }
};
var clone = exports.clone;

/*!
 * ignore
 */

function cloneObject(obj, options) {
  var retainKeyOrder = options && options.retainKeyOrder,
      minimize = options && options.minimize,
      ret = {},
      hasKeys,
      keys,
      val,
      k,
      i;

  if (retainKeyOrder) {
    for (k in obj) {
      val = clone(obj[k], options);

      if (!minimize || (typeof val !== 'undefined')) {
        hasKeys || (hasKeys = true);
        ret[k] = val;
      }
    }
  } else {
    // faster

    keys = Object.keys(obj);
    i = keys.length;

    while (i--) {
      k = keys[i];
      val = clone(obj[k], options);

      if (!minimize || (typeof val !== 'undefined')) {
        if (!hasKeys) {
          hasKeys = true;
        }
        ret[k] = val;
      }
    }
  }

  return minimize
      ? hasKeys && ret
      : ret;
}

function cloneArray(arr, options) {
  var ret = [];
  for (var i = 0, l = arr.length; i < l; i++) {
    ret.push(clone(arr[i], options));
  }
  return ret;
}

/*!
 * Shallow copies defaults into options.
 *
 * @param {Object} defaults
 * @param {Object} options
 * @return {Object} the merged object
 * @api private
 */

exports.options = function(defaults, options) {
  var keys = Object.keys(defaults),
      i = keys.length,
      k;

  options = options || {};

  while (i--) {
    k = keys[i];
    if (!(k in options)) {
      options[k] = defaults[k];
    }
  }

  return options;
};

/*!
 * Generates a random string
 *
 * @api private
 */

exports.random = function() {
  return Math.random().toString().substr(3);
};

/*!
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */

exports.merge = function merge(to, from, options) {
  options = options || {};
  var keys = Object.keys(from);
  var i = 0;
  var len = keys.length;
  var key;

  if (options.retainKeyOrder) {
    while (i < len) {
      key = keys[i++];
      if (typeof to[key] === 'undefined') {
        to[key] = from[key];
      } else if (exports.isObject(from[key])) {
        merge(to[key], from[key]);
      } else if (options.overwrite) {
        to[key] = from[key];
      }
    }
  } else {
    while (len--) {
      key = keys[len];
      if (typeof to[key] === 'undefined') {
        to[key] = from[key];
      } else if (exports.isObject(from[key])) {
        merge(to[key], from[key]);
      } else if (options.overwrite) {
        to[key] = from[key];
      }
    }
  }
};

/*!
 * toString helper
 */

var toString = Object.prototype.toString;

/*!
 * Applies toObject recursively.
 *
 * @param {Document|Array|Object} obj
 * @return {Object}
 * @api private
 */

exports.toObject = function toObject(obj) {
  Document || (Document = require('./document'));
  var ret;

  if (exports.isNullOrUndefined(obj)) {
    return obj;
  }

  if (obj instanceof Document) {
    return obj.toObject();
  }

  if (Array.isArray(obj)) {
    ret = [];

    for (var i = 0, len = obj.length; i < len; ++i) {
      ret.push(toObject(obj[i]));
    }

    return ret;
  }

  if ((obj.constructor && exports.getFunctionName(obj.constructor) === 'Object') ||
      (!obj.constructor && exports.isObject(obj))) {
    ret = {};

    for (var k in obj) {
      ret[k] = toObject(obj[k]);
    }

    return ret;
  }

  return obj;
};

/*!
 * Determines if `arg` is an object.
 *
 * @param {Object|Array|String|Function|RegExp|any} arg
 * @api private
 * @return {Boolean}
 */

exports.isObject = function(arg) {
  if (Buffer.isBuffer(arg)) {
    return true;
  }
  return toString.call(arg) === '[object Object]';
};

/*!
 * A faster Array.prototype.slice.call(arguments) alternative
 * @api private
 */

exports.args = sliced;

/*!
 * process.nextTick helper.
 *
 * Wraps `callback` in a try/catch + nextTick.
 *
 * node-mongodb-native has a habit of state corruption when an error is immediately thrown from within a collection callback.
 *
 * @param {Function} callback
 * @api private
 */

exports.tick = function tick(callback) {
  if (typeof callback !== 'function') {
    return;
  }
  return function() {
    try {
      callback.apply(this, arguments);
    } catch (err) {
      // only nextTick on err to get out of
      // the event loop and avoid state corruption.
      process.nextTick(function() {
        throw err;
      });
    }
  };
};

/*!
 * Returns if `v` is a mongoose object that has a `toObject()` method we can use.
 *
 * This is for compatibility with libs like Date.js which do foolish things to Natives.
 *
 * @param {any} v
 * @api private
 */

exports.isMongooseObject = function(v) {
  Document || (Document = require('./document'));
  MongooseArray || (MongooseArray = require('./types').Array);
  MongooseBuffer || (MongooseBuffer = require('./types').Buffer);

  return v instanceof Document ||
      (v && v.isMongooseArray) ||
      (v && v.isMongooseBuffer);
};
var isMongooseObject = exports.isMongooseObject;

/*!
 * Converts `expires` options of index objects to `expiresAfterSeconds` options for MongoDB.
 *
 * @param {Object} object
 * @api private
 */

exports.expires = function expires(object) {
  if (!(object && object.constructor.name === 'Object')) {
    return;
  }
  if (!('expires' in object)) {
    return;
  }

  var when;
  if (typeof object.expires !== 'string') {
    when = object.expires;
  } else {
    when = Math.round(ms(object.expires) / 1000);
  }
  object.expireAfterSeconds = when;
  delete object.expires;
};

/*!
 * Populate options constructor
 */

function PopulateOptions(path, select, match, options, model, subPopulate) {
  this.path = path;
  this.match = match;
  this.select = select;
  this.options = options;
  this.model = model;
  if (typeof subPopulate === 'object') {
    this.populate = subPopulate;
  }
  this._docs = {};
}

// make it compatible with utils.clone
PopulateOptions.prototype.constructor = Object;

// expose
exports.PopulateOptions = PopulateOptions;

/*!
 * populate helper
 */

exports.populate = function populate(path, select, model, match, options, subPopulate) {
  // The order of select/conditions args is opposite Model.find but
  // necessary to keep backward compatibility (select could be
  // an array, string, or object literal).

  // might have passed an object specifying all arguments
  if (arguments.length === 1) {
    if (path instanceof PopulateOptions) {
      return [path];
    }

    if (Array.isArray(path)) {
      return path.map(function(o) {
        return exports.populate(o)[0];
      });
    }

    if (exports.isObject(path)) {
      match = path.match;
      options = path.options;
      select = path.select;
      model = path.model;
      subPopulate = path.populate;
      path = path.path;
    }
  } else if (typeof model !== 'string' && typeof model !== 'function') {
    options = match;
    match = model;
    model = undefined;
  }

  if (typeof path !== 'string') {
    throw new TypeError('utils.populate: invalid path. Expected string. Got typeof `' + typeof path + '`');
  }

  if (typeof subPopulate === 'object') {
    subPopulate = exports.populate(subPopulate);
  }

  var ret = [];
  var paths = path.split(' ');
  options = exports.clone(options, { retainKeyOrder: true });
  for (var i = 0; i < paths.length; ++i) {
    ret.push(new PopulateOptions(paths[i], select, match, options, model, subPopulate));
  }

  return ret;
};

/*!
 * Return the value of `obj` at the given `path`.
 *
 * @param {String} path
 * @param {Object} obj
 */

exports.getValue = function(path, obj, map) {
  return mpath.get(path, obj, '_doc', map);
};

/*!
 * Sets the value of `obj` at the given `path`.
 *
 * @param {String} path
 * @param {Anything} val
 * @param {Object} obj
 */

exports.setValue = function(path, val, obj, map) {
  mpath.set(path, val, obj, '_doc', map);
};

/*!
 * Returns an array of values from object `o`.
 *
 * @param {Object} o
 * @return {Array}
 * @private
 */

exports.object = {};
exports.object.vals = function vals(o) {
  var keys = Object.keys(o),
      i = keys.length,
      ret = [];

  while (i--) {
    ret.push(o[keys[i]]);
  }

  return ret;
};

/*!
 * @see exports.options
 */

exports.object.shallowCopy = exports.options;

/*!
 * Safer helper for hasOwnProperty checks
 *
 * @param {Object} obj
 * @param {String} prop
 */

var hop = Object.prototype.hasOwnProperty;
exports.object.hasOwnProperty = function(obj, prop) {
  return hop.call(obj, prop);
};

/*!
 * Determine if `val` is null or undefined
 *
 * @return {Boolean}
 */

exports.isNullOrUndefined = function(val) {
  return val === null || val === undefined;
};

/*!
 * ignore
 */

exports.array = {};

/*!
 * Flattens an array.
 *
 * [ 1, [ 2, 3, [4] ]] -> [1,2,3,4]
 *
 * @param {Array} arr
 * @param {Function} [filter] If passed, will be invoked with each item in the array. If `filter` returns a falsey value, the item will not be included in the results.
 * @return {Array}
 * @private
 */

exports.array.flatten = function flatten(arr, filter, ret) {
  ret || (ret = []);

  arr.forEach(function(item) {
    if (Array.isArray(item)) {
      flatten(item, filter, ret);
    } else {
      if (!filter || filter(item)) {
        ret.push(item);
      }
    }
  });

  return ret;
};

/*!
 * Removes duplicate values from an array
 *
 * [1, 2, 3, 3, 5] => [1, 2, 3, 5]
 * [ ObjectId("550988ba0c19d57f697dc45e"), ObjectId("550988ba0c19d57f697dc45e") ]
 *    => [ObjectId("550988ba0c19d57f697dc45e")]
 *
 * @param {Array} arr
 * @return {Array}
 * @private
 */

exports.array.unique = function(arr) {
  var primitives = {};
  var ids = {};
  var ret = [];
  var length = arr.length;
  for (var i = 0; i < length; ++i) {
    if (typeof arr[i] === 'number' || typeof arr[i] === 'string') {
      if (primitives[arr[i]]) {
        continue;
      }
      ret.push(arr[i]);
      primitives[arr[i]] = true;
    } else if (arr[i] instanceof ObjectId) {
      if (ids[arr[i].toString()]) {
        continue;
      }
      ret.push(arr[i]);
      ids[arr[i].toString()] = true;
    } else {
      ret.push(arr[i]);
    }
  }

  return ret;
};

/*!
 * Determines if two buffers are equal.
 *
 * @param {Buffer} a
 * @param {Object} b
 */

exports.buffer = {};
exports.buffer.areEqual = function(a, b) {
  if (!Buffer.isBuffer(a)) {
    return false;
  }
  if (!Buffer.isBuffer(b)) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (var i = 0, len = a.length; i < len; ++i) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

exports.getFunctionName = function(fn) {
  if (fn.name) {
    return fn.name;
  }
  return (fn.toString().trim().match(/^function\s*([^\s(]+)/) || [])[1];
};

exports.decorate = function(destination, source) {
  for (var key in source) {
    destination[key] = source[key];
  }
};

/**
 * merges to with a copy of from
 *
 * @param {Object} to
 * @param {Object} fromObj
 * @api private
 */

exports.mergeClone = function(to, fromObj) {
  var keys = Object.keys(fromObj);
  var len = keys.length;
  var i = 0;
  var key;

  while (i < len) {
    key = keys[i++];
    if (typeof to[key] === 'undefined') {
      // make sure to retain key order here because of a bug handling the $each
      // operator in mongodb 2.4.4
      to[key] = exports.clone(fromObj[key], {retainKeyOrder: 1});
    } else {
      if (exports.isObject(fromObj[key])) {
        var obj = fromObj[key];
        if (isMongooseObject(fromObj[key]) && !fromObj[key].isMongooseBuffer) {
          obj = obj.toObject({ transform: false });
        }
        exports.mergeClone(to[key], obj);
      } else {
        // make sure to retain key order here because of a bug handling the
        // $each operator in mongodb 2.4.4
        to[key] = exports.clone(fromObj[key], {retainKeyOrder: 1});
      }
    }
  }
};

/**
 * Executes a function on each element of an array (like _.each)
 *
 * @param {Array} arr
 * @param {Function} fn
 * @api private
 */

exports.each = function(arr, fn) {
  for (var i = 0; i < arr.length; ++i) {
    fn(arr[i]);
  }
};
