
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , ObjectId = require('./types/objectid')

/**
 * Produces a collection name from a model name
 *
 * @param {String} model name
 * @return {String} collection name
 * @api private
 */

exports.toCollectionName = function(name) {
  return pluralize(name.toLowerCase());
};

/**
 * Pluralization rules.
 */

var rules = [
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

/**
 * Uncountable words.
 */

var uncountables = [
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
  'paprer',
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

/**
 * Pluralize function.
 *
 * @author TJ Holowaychuk (extracted from _ext.js_)
 * @param {String} string to pluralize
 * @api private
 */

function pluralize (str) {
  var rule, found;
  if (!~uncountables.indexOf(str.lowercase)){
    found = rules.filter(function(rule){
      return str.match(rule[0]);
    });
    if (found[0]) return str.replace(found[0][0], found[0][1]);
  }
  return str;
};

/**
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

  /**
   * Inherit from EventEmitter.
   */

  Events.prototype.__proto__ = EventEmitter.prototype;
  
  /**
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
 * Object clone with Mongoose natives support
 *
 * @param {Object} object to clone
 * @return {Object} cloned object
 * @api private
 */

var clone = exports.clone = function (obj) {
  if (obj === undefined || obj === null)
    return obj;
  if (Array.isArray(obj))
    return cloneArray(obj);
  if (obj.toObject)
    return obj.toObject();
  if (obj.constructor == Object)
    return cloneObject(obj);
  if (obj.constructor == Date || obj.constructor == RegExp
   || obj.constructor == Function)
    return new obj.constructor(+obj);
  if (obj instanceof ObjectId)
    return ObjectId.fromString(ObjectId.toString(obj));
  if (obj.valueOf)
    return obj.valueOf();
  return obj;
};

function cloneObject (obj) {
  var ret = {};
  for (var i in obj)
    ret[i] = clone(obj[i]);
  return ret;
};

function cloneArray (arr) {
  var ret = [];
  for (var i = 0, l = arr.length; i < l; i++)
    ret.push(clone(arr[i]));
  return ret;
};

/**
 * Copies and merges options with defaults.
 *
 * @param {Object} defaults
 * @param {Object} supplied options
 * @return {Object} new (merged) object
 * @api private
 */

exports.options = function (defaults, opts){
  var opts = opts || {}
    , c = clone(opts);
  for (var i in defaults)
    if (!(i in opts))
      c[i] = clone(defaults[i]);
  return c;
};

/**
 * Erases an item from an array
 *
 * @param {Array} array
 * @param {Object} value
 * @return undefined
 * @api private
 */

exports.erase = function (arr, item) {
  for (var i = 0, l = arr.length; i < l; i++)
    if (arr[i] === item) arr.splice(i, 1);
};

/**
 * Generates a random string
 *
 * @api private
 */

exports.random = function () {
  return Math.random().toString().substr(3);
};
