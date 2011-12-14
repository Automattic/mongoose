
/**
 * Module dependencies.
 */

var EmbeddedDocument = require('./embedded');
var Document = require('../document');
var ObjectId = require('./objectid');

/**
 * Mongoose Array constructor.
 * Values always have to be passed to the constructor to initialize, since
 * otherwise MongooseArray#push will mark the array as modified to the parent.
 *
 * @param {Array} values
 * @param {String} key path
 * @param {Document} parent document
 * @api private
 * @see http://bit.ly/f6CnZU
 */

function MongooseArray (values, path, doc) {
  var arr = [];
  arr.push.apply(arr, values);
  arr.__proto__ = MongooseArray.prototype;

  arr._atomics = {};
  arr.validators = [];
  arr._path = path;

  if (doc) {
    arr._parent = doc;
    arr._schema = doc.schema.path(path);
  }

  return arr;
};

/**
 * Inherit from Array
 */

MongooseArray.prototype = new Array;

/**
 * Stores a queue of atomic operations to perform
 *
 * @api private
 */

MongooseArray.prototype._atomics;

/**
 * Parent owner document
 *
 * @api private
 */

MongooseArray.prototype._parent;

/**
 * Casts a member
 *
 * @api private
 */

MongooseArray.prototype._cast = function (value) {
  var cast = this._schema.caster.cast
    , doc = this._parent;

  return cast.call(null, value, doc);
};

/**
 * Marks this array as modified.
 * It is called during a nonAtomicPush, an atomic opteration,
 * or by an existing embedded document that is modified.
 *
 * If it bubbles up from an embedded document change,
 * then it takes the following arguments (otherwise, takes
 * 0 arguments)
 * @param {EmbeddedDocument} embeddedDoc that invokes this method on the Array
 * @param {String} embeddedPath is what changed inthe embeddedDoc
 *
 * @api public
 */

MongooseArray.prototype._markModified = function (embeddedDoc, embeddedPath) {
  var parent = this._parent
    , dirtyPath;

  if (parent) {
    if (arguments.length) {
      // If an embedded doc bubbled up the change
      dirtyPath = [this._path, this.indexOf(embeddedDoc), embeddedPath].join('.');
    } else {
      dirtyPath = this._path;
    }
    parent.markModified(dirtyPath);
  }

  return this;
};

/**
 * Register an atomic operation with the parent
 *
 * @param {Array} operation
 * @api private
 */

MongooseArray.prototype._registerAtomic = function (op, val) {
  var atomics = this._atomics
  if (op === '$pullAll' || op === '$pushAll' || op === '$addToSet') {
    atomics[op] || (atomics[op] = []);
    atomics[op] = atomics[op].concat(val);
  } else if (op === '$pullDocs') {
    var pullOp = atomics['$pull'] || (atomics['$pull'] = {})
      , selector = pullOp['_id'] || (pullOp['_id'] = {'$in' : [] });
    selector['$in'] = selector['$in'].concat(val);
  } else {
    atomics[op] = val;
  }
  this._markModified();
  return this;
};

/**
 * Returns true if we have to perform atomics for this, and no normal
 * operations
 *
 * @api public
 */

MongooseArray.prototype.__defineGetter__('doAtomics', function () {
  if (!(this._atomics && 'Object' === this._atomics.constructor.name)) {
    return 0;
  }

  return Object.keys(this._atomics).length;
});

/**
 * Pushes item/s to the array atomically. Overrides Array#push
 *
 * @param {Object} value
 * @api public
 */

var oldPush = Array.prototype.push;

MongooseArray.prototype.$push =
MongooseArray.prototype.push = function () {
  var values = Array.prototype.map.call(arguments, this._cast, this)
    , ret = oldPush.apply(this, values);

  // $pushAll might be fibbed (could be $push). But it makes it easier to
  // handle what could have been $push, $pushAll combos
  this._registerAtomic('$pushAll', values);

  return ret;
};

/**
 * Pushes item/s to the array non-atomically
 *
 * @param {Object} value
 * @api public
 */

MongooseArray.prototype.nonAtomicPush = function () {
  var values = Array.prototype.map.call(arguments, this._cast, this)
    , ret = oldPush.apply(this, values);

  this._markModified();

  return ret;
};

/**
 * Pushes several items at once to the array atomically
 *
 * @param {Array} values
 * @api public
 */

MongooseArray.prototype.$pushAll = function (value) {
  var length = this.length;
  this.nonAtomicPush.apply(this, value);
  // make sure we access the casted elements
  this._registerAtomic('$pushAll', this.slice(length));
  return this;
};

/**
 * Pops the array atomically
 *
 * @api public
 */

MongooseArray.prototype.$pop = function () {
  this._registerAtomic('$pop', 1);
  return this.pop();
};

/**
 * Shifts the array
 *
 * @api public
 */

MongooseArray.prototype.$shift = function () {
  this._registerAtomic('$pop', -1);
  return this.shift();
};

/**
 * Removes items from an array atomically
 *
 * Examples:
 *     doc.array.remove(ObjectId)
 *     doc.array.remove('tag 1', 'tag 2')
 *
 * @param {Object} value to remove
 * @api public
 */

MongooseArray.prototype.remove = function () {
  var args = Array.prototype.map.call(arguments, this._cast, this);
  if (args.length == 1)
    this.$pull(args[0]);
  else
    this.$pullAll(args);
  return args;
};

/**
 * Pulls from the array
 *
 * @api public
 */

MongooseArray.prototype.pull =
MongooseArray.prototype.$pull = function () {
  var values = Array.prototype.map.call(arguments, this._cast, this)
    , oldArr = this._parent.get(this._path)
    , i = oldArr.length
    , mem;

  while (i--) {
    mem = oldArr[i];
    if (mem instanceof EmbeddedDocument) {
      if (values.some(function (v) { return v.equals(mem); } )) {
        oldArr.splice(i, 1);
      }
    } else if (~values.indexOf(mem)) {
      oldArr.splice(i, 1);
    }
  }

  if (values[0] instanceof EmbeddedDocument) {
    this._registerAtomic('$pullDocs', values.map( function (v) { return v._id; } ));
  } else {
    this._registerAtomic('$pullAll', values);
  }

  return this;
};

/**
 * Pulls many items from an array
 *
 * @api public
 */

MongooseArray.prototype.$pullAll = function (values) {
  if (values && values.length) {
    var oldArr = this._parent.get(this._path)
      , i = oldArr.length, mem;
    while (i--) {
      mem = oldArr[i];
      if (mem instanceof EmbeddedDocument) {
        if (values.some( function (v) { return v.equals(mem); } )) {
          oldArr.splice(i, 1);
        }
      } else if (~values.indexOf(mem)) oldArr.splice(i, 1);
    }
    if (values[0] instanceof EmbeddedDocument) {
      this._registerAtomic('$pullDocs', values.map( function (v) { return v._id; } ));
    } else {
      this._registerAtomic('$pullAll', values);
    }
  }
  return this;
};

/**
 * Splices the array.
 *
 * Note: marks the _entire_ array as modified which
 * will pass the entire thing to $set potentially
 * overwritting any changes that happen between
 * when you retrieved the object and when you save
 * it.
 *
 * @api public
 */

var oldSplice = Array.prototype.splice;
MongooseArray.prototype.splice = function () {
  oldSplice.apply(this, arguments);
  this._markModified();
  return this;
};

/**
 * Unshifts onto the array.
 *
 * Note: marks the _entire_ array as modified which
 * will pass the entire thing to $set potentially
 * overwritting any changes that happen between
 * when you retrieved the object and when you save
 * it.
 *
 * @api public
 */

var oldUnshift = Array.prototype.unshift;
MongooseArray.prototype.unshift = function () {
  var values = Array.prototype.map.call(arguments, this._cast, this);
  oldUnshift.apply(this, values);
  this._markModified();
  return this.length;
};

/**
 * Adds values to the array if not already present.
 * @api public
 */

MongooseArray.prototype.$addToSet =
MongooseArray.prototype.addToSet = function addToSet () {
  var values = Array.prototype.map.call(arguments, this._cast, this)
    , added = []
    , type = values[0] instanceof EmbeddedDocument ? 'doc' :
             values[0] instanceof Date ? 'date' :
             '';

  values.forEach(function (v) {
    var found;
    switch (type) {
      case 'doc':
        found = this.some(function(doc){ return doc.equals(v) });
        break;
      case 'date':
        var val = +v;
        found = this.some(function(d){ return +d === val });
        break;
      default:
        found = ~this.indexOf(v);
    }

    if (!found) {
      oldPush.call(this, v);
      this._registerAtomic('$addToSet', v);
      oldPush.call(added, v);
    }
  }, this);

  return added;
};

/**
 * Returns an Array
 *
 * @return {Array}
 * @api public
 */

MongooseArray.prototype.toObject = function (options) {
  if (options && options.depopulate && this[0] instanceof Document) {
    return this.map(function (doc) {
      return doc._id;
    });
  }

  return this.map(function (doc) {
    return doc;
  });
};

/**
 * Helper for console.log
 *
 * @api public
 */

MongooseArray.prototype.inspect = function () {
  return '[' + this.map(function (doc) {
    return ' ' + doc;
  }) + ' ]';
};

/**
 * Return the index of `obj` or `-1.`
 *
 * @param {Object} obj
 * @return {Number}
 * @api public
 */

MongooseArray.prototype.indexOf = function indexOf (obj) {
  if (obj instanceof ObjectId) obj = obj.toString();
  for (var i = 0, len = this.length; i < len; ++i) {
    if (obj == this[i])
      return i;
  }
  return -1;
};

/**
 * Module exports.
 */

module.exports = exports = MongooseArray;
