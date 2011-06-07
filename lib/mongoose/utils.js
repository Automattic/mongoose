
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

exports.toCollectionName = function (name) {
  if ('system.profile' === name) return name;
  if ('system.indexes' === name) return name;
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
  if (!~uncountables.indexOf(str.toLowerCase())){
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

// Modified from node/lib/assert.js
exports.deepEqual = function deepEqual (a, b) {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  if (typeof a !== 'object' && typeof b !== 'object')
    return a == b;
  if (a === null || b === null || a === undefined || b === undefined)
    return false
  if (a.prototype !== b.prototype) return false;

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

  // Handle MongooseNumber edge case
  if (a.valueOf && b.valueOf && a.valueOf() !== b.valueOf()) {
    return false;
  }

  return true;
};

/**
 * Object clone with Mongoose natives support.
 * Creates a minimal data Object.
 * It does not clone empty Arrays, empty Objects,
 * and undefined values.
 * This makes the data payload sent to MongoDB as minimal
 * as possible.
 *
 * @param {Object} object to clone
 * @param {Boolean} shouldMinimizeData
 * @return {Object} cloned object
 * @api private
 */

var clone = exports.clone = function (obj, shouldMinimizeData) {
  if (obj === undefined || obj === null)
    return obj

  if (Array.isArray(obj))
    return cloneArray(obj, shouldMinimizeData);

  if (obj.toObject)
    return obj.toObject();

  if (obj.constructor == Object)
    return cloneObject(obj, shouldMinimizeData);

  if (obj.constructor == Date || obj.constructor == Function)
    return new obj.constructor(+obj);

  if (obj.constructor == RegExp)
    return new RegExp(obj.source);

  if (obj instanceof ObjectId)
    return ObjectId.fromString(ObjectId.toString(obj));

  if (obj.valueOf)
    return obj.valueOf();
};

function cloneObject (obj, shouldMinimizeData) {
  var ret = {}
    , val
    , hasKeys;
  for (var k in obj) {
    val = clone(obj[k], shouldMinimizeData);
    if (!shouldMinimizeData || ('undefined' !== typeof val)) {
      hasKeys || (hasKeys = true);
      ret[k] = val;
    }
  }
  return shouldMinimizeData
    ? hasKeys && ret
    : ret;
};

function cloneArray (arr, shouldMinimizeData) {
  var ret = [];
  for (var i = 0, l = arr.length; i < l; i++)
    ret.push(clone(arr[i], shouldMinimizeData));
  return ret;
};

/**
 * Copies and merges options with defaults.
 *
 * @param {Object} defaults
 * @param {Object} options
 * @return {Object} (merged) object
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


/**
 * A StateMachine represents a minimal `interface` for the
 * constructors it builds via StateMachine.ctor(...).
 *
 * @api private
 */

function StateMachine () {
  this.paths = {};
  this.states = {};
}

/**
 * StateMachine.ctor('state1', 'state2', ...)
 * A factory method for subclassing StateMachine.
 * The arguments are a list of states. For each state,
 * the constructor's prototype gets state transition
 * methods named after each state. These transition methods
 * place their path argument into the given state.
 *
 * @param {String} state
 * @param {String} [state]
 * @return {Function} subclass constructor
 * @api public
 */

StateMachine.ctor = function () {
  var states = [].slice.call(arguments);
  var ctor = function () {
    StateMachine.apply(this, arguments);
    this.stateNames = states;
    var i = states.length
      , state;
    while (i--) {
      state = states[i];
      this.states[state] = {};
    }
  };

  ctor.prototype.__proto__ = StateMachine.prototype;
  states.forEach( function (state) {
    /**
     * Changes the `path`'s state to `state`.
     */
    ctor.prototype[state] = function (path) {
      this._changeState(path, state);
    }
  });
  return ctor;
};

StateMachine.prototype = {
  /**
   * This function is wrapped by the state change functions:
   * - `require(path)`
   * - `modify(path)`
   * - `init(path)`
   * @api private
   */

  _changeState: function (path, nextState) {
    var prevState = this.paths[path]
      , prevBucket = this.states[prevState];
    delete this.paths[path];
    if (prevBucket) delete prevBucket[path];

    this.paths[path] = nextState;
    this.states[nextState][path] = true;
  },

  stateOf: function (path) {
    return this.paths[path];
  },

  clear: function (state) {
    for (var path in this.states[state]) {
      delete this.states[state][path];
      delete this.paths[path];
    }
  },

  /**
   * Checks to see if at least one path is in the states passed in via `arguments`
   * e.g., this.some('required', 'inited')
   * @param {String} state that we want to check for.
   * @api public
   */

  some: function () {
    var self = this;
    return Array.prototype.some.call(arguments.length ? arguments : this.stateNames, function (state) {
      return Object.keys(self.states[state]).length;
    });
  },

  /**
   * This function builds the functions that get assigned to `forEach` and `map`,
   * since both of those methods share a lot of the same logic.
   *
   * @param {String} iterMethod is either 'forEach' or 'map'
   * @return {Function}
   * @api private
   */

  _iter: function (iterMethod) {
    return function () {
      var numArgs = arguments.length
        , states = [].slice.call(arguments, 0, numArgs-1)
        , callback = arguments[arguments.length-1];
      if (!states.length) states = this.stateNames;
      var self = this;
      var paths = states.reduce( function (paths, state) {
        return paths.concat(Object.keys(self.states[state]));
        
      }, []);
      return paths[iterMethod]( function (path) {
        return callback(path);
      });
    };
  },

  /**
   * Iterates over the paths that belong to one of the parameter states.
   *
   * The function profile can look like:
   * this.forEach(state1, fn);         // iterates over all paths in state1
   * this.forEach(state1, state2, fn); // iterates over all paths in state1 or state2
   * this.forEach(fn);                 // iterates over all paths in all states
   *
   * @param {String} [state]
   * @param {String} [state]
   * @param {Function} callback
   * @api public
   */

  forEach: function () {
    this.forEach = this._iter('forEach');
    return this.forEach.apply(this, arguments);
  },

  /**
   * Maps over the paths that belong to one of the parameter states.
   *
   * The function profile can look like:
   * this.forEach(state1, fn);         // iterates over all paths in state1
   * this.forEach(state1, state2, fn); // iterates over all paths in state1 or state2
   * this.forEach(fn);                 // iterates over all paths in all states
   *
   * @param {String} [state]
   * @param {String} [state]
   * @param {Function} callback
   * @return {Array}
   * @api public
   */

  map: function () {
    this.map = this._iter('map');
    return this.map.apply(this, arguments);
  }
};

exports.StateMachine = StateMachine;

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

exports.merge = function merge (objA, objB) {
  for (var k in objB) {
    if ('undefined' === typeof objA[k]) {
      objA[k] = objB[k];
    } else {
      merge(objA[k], objB[k]);
    }
  }
};
