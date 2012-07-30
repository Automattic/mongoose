/*!
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , ObjectId = require('./types/objectid')
  , ms = require('ms')
  , MongooseBuffer
  , MongooseArray
  , Document

/**
 * Produces a collection name from model `name`.
 *
 * @param {String} name a model name
 * @return {String} a collection name
 * @api private
 */

exports.toCollectionName = function (name) {
  if ('system.profile' === name) return name;
  if ('system.indexes' === name) return name;
  return pluralize(name.toLowerCase());
};

/**
 * Pluralization rules.
 *
 * These rules are applied while processing the argument to `toCollectionName`.
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
  [/(quiz)$/gi, '$1zes'],
  [/s$/gi, 's'],
  [/$/gi, 's']
];
var rules = exports.pluralization;

/**
 * Uncountable words.
 *
 * These words are applied while processing the argument to `toCollectionName`.
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
  'news'
];
var uncountables = exports.uncountables;

/*!
 * Pluralize function.
 *
 * @author TJ Holowaychuk (extracted from _ext.js_)
 * @param {String} string to pluralize
 * @api private
 */

function pluralize (str) {
  var rule, found;
  if (!~uncountables.indexOf(str.toLowerCase())){
    found = rules.filter(function(rule){
      return str.match(rule[0]);
    });
    if (found[0]) return str.replace(found[0][0], found[0][1]);
  }
  return str;
};

/*!
 * Add `once` to EventEmitter if absent
 *
 * @param {String} event name
 * @param {Function} listener
 * @api private
 */

var Events = EventEmitter;

if (!('once' in EventEmitter.prototype)){

  Events = function () {
    EventEmitter.apply(this, arguments);
  };

  /*!
   * Inherit from EventEmitter.
   */

  Events.prototype.__proto__ = EventEmitter.prototype;

  /*!
   * Add `once`.
   */

  Events.prototype.once = function (type, listener) {
    var self = this;
    self.on(type, function g(){
      self.removeListener(type, g);
      listener.apply(this, arguments);
    });
  };
}
exports.EventEmitter = Events;

/**
 * Determines if `a` and `b` are deep equal.
 *
 * Modified from node/lib/assert.js
 *
 * @param {any} a a value to compare to `b`
 * @param {any} b a value to compare to `a`
 * @return {Boolean}
 * @api private
 */

exports.deepEqual = function deepEqual (a, b) {
  if (a === b) return true;

  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();

  if (a instanceof ObjectId && b instanceof ObjectId) {
    return a.toString() === b.toString();
  }

  if (typeof a !== 'object' && typeof b !== 'object')
    return a == b;

  if (a === null || b === null || a === undefined || b === undefined)
    return false

  if (a.prototype !== b.prototype) return false;

  // Handle MongooseNumbers
  if (a instanceof Number && b instanceof Number) {
    return a.valueOf() === b.valueOf();
  }

  if (Buffer.isBuffer(a)) {
    if (!Buffer.isBuffer(b)) return false;
    if (a.length !== b.length) return false;
    for (var i = 0, len = a.length; i < len; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  if (isMongooseObject(a)) a = a.toObject();
  if (isMongooseObject(b)) b = b.toObject();

  try {
    var ka = Object.keys(a),
        kb = Object.keys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }

  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;

  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();

  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }

  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
};

/**
 * Object clone with Mongoose natives support.
 *
 * Creates a minimal data Object.
 * It does not clone empty Arrays, empty Objects, and undefined values.
 * This makes the data payload sent to MongoDB as minimal as possible.
 *
 * @param {Object} obj the object to clone
 * @param {Object} options
 * @return {Object} the cloned object
 * @api private
 */

exports.clone = function clone (obj, options) {
  if (obj === undefined || obj === null)
    return obj;

  if (Array.isArray(obj))
    return cloneArray(obj, options);

  if (isMongooseObject(obj)) {
    if (options && options.json && 'function' === typeof obj.toJSON) {
      return obj.toJSON(options);
    } else {
      return obj.toObject(options);
    }
  }

  if ('Object' === obj.constructor.name)
    return cloneObject(obj, options);

  if ('Date' === obj.constructor.name || 'Function' === obj.constructor.name)
    return new obj.constructor(+obj);

  if ('RegExp' === obj.constructor.name)
    return new RegExp(obj.source);

  if (obj instanceof ObjectId) {
    return new ObjectId(obj.id);
  }

  if (obj.valueOf)
    return obj.valueOf();
};
var clone = exports.clone;

/*!
 * ignore
 */

function cloneObject (obj, options) {
  var retainKeyOrder = options && options.retainKeyOrder
    , minimize = options && options.minimize
    , ret = {}
    , hasKeys
    , keys
    , val
    , k
    , i

  if (retainKeyOrder) {
    for (k in obj) {
      val = clone(obj[k], options);

      if (!minimize || ('undefined' !== typeof val)) {
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

      if (!minimize || ('undefined' !== typeof val)) {
        if (!hasKeys) hasKeys = true;
        ret[k] = val;
      }
    }
  }

  return minimize
    ? hasKeys && ret
    : ret;
};

function cloneArray (arr, options) {
  var ret = [];
  for (var i = 0, l = arr.length; i < l; i++)
    ret.push(clone(arr[i], options));
  return ret;
};

/**
 * Copies and merges options with defaults.
 *
 * @param {Object} defaults
 * @param {Object} options
 * @return {Object} the merged object
 * @api private
 */

exports.options = function (defaults, options) {
  var keys = Object.keys(defaults)
    , i = keys.length
    , k ;

  options = options || {};

  while (i--) {
    k = keys[i];
    if (!(k in options)) {
      options[k] = defaults[k];
    }
  }

  return options;
};

/**
 * Generates a random string
 *
 * @api private
 */

exports.random = function () {
  return Math.random().toString().substr(3);
};

/*!
 * TODO remove
 */

exports.inGroupsOf = function inGroupsOf (card, arr, fn) {
  var group = [];
  for (var i = 0, l = arr.length; i < l; i++) {
    if (i && i % card === 0) {
      fn.apply(this, group);
      group.length = 0;
    }
    group.push(arr[i]);
  }
  fn.apply(this, group);
};

/**
 * Merges `from` into `to` without overwriting existing properties.
 *
 * @param {Object} to
 * @param {Object} from
 * @api private
 */

exports.merge = function merge (to, from) {
  var keys = Object.keys(from)
    , i = keys.length
    , key

  while (i--) {
    key = keys[i];
    if ('undefined' === typeof to[key]) {
      to[key] = from[key];
    } else {
      merge(to[key], from[key]);
    }
  }
};

/**
 * A faster Array.prototype.slice.call(arguments) alternative
 * @api private
 */

exports.args = function (args, slice, sliceEnd) {
  var ret = [];
  var start = slice || 0;
  var end = 3 === arguments.length
    ? sliceEnd
    : args.length;

  for (var i = start; i < end; ++i) {
    ret[i - start] = args[i];
  }

  return ret;
}

/**
 * process.nextTick helper.
 *
 * Wraps `callback` in a try/catch + nextTick.
 *
 * node-mongodb-native has a habit of state corruption when an error is immediately thrown from within a collection callback.
 *
 * @param {Function} callback
 * @api private
 */

exports.tick = function tick (callback) {
  if ('function' !== typeof callback) return;
  return function () {
    try {
      callback.apply(this, arguments);
    } catch (err) {
      // only nextTick on err to get out of
      // the event loop and avoid state corruption.
      process.nextTick(function () {
        throw err;
      });
    }
  }
}

/**
 * Returns if `v` is a mongoose object that has a `toObject()` method we can use.
 *
 * This is for compatibility with libs like Date.js which do foolish things to Natives.
 *
 * @param {any} v
 * @api private
 */

exports.isMongooseObject = function (v) {
  Document || (Document = require('./document'));
  MongooseArray || (MongooseArray = require('./types').Array);
  MongooseBuffer || (MongooseBuffer = require('./types').Buffer);

  return v instanceof Document ||
         v instanceof MongooseArray ||
         v instanceof MongooseBuffer
}
var isMongooseObject = exports.isMongooseObject;

/**
 * Converts `expires` options of index objects to `expiresAfterSeconds` options for MongoDB.
 *
 * @param {Object} object
 * @api private
 */

exports.expires = function expires (object) {
  if (!(object && 'Object' == object.constructor.name)) return;
  if (!('expires' in object)) return;

  var when;
  if ('string' != typeof object.expires) {
    when = object.expires;
  } else {
    when = Math.round(ms(object.expires) / 1000);
  }
  object.expiresAfterSeconds = when;
  delete object.expires;
}
