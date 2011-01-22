
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , Types = require('./schema/');

/**
 * Schema constructor.
 *
 * @param {Objet} definition
 * @api public
 */

function Schema (obj) {
  this.paths = {};
  this.inherits = {};
  this.callQueue = [];
  this._indexes = [];
  this._methods = {};
  this._statics = {};
  this.tree = {};
  if (obj)
    this.add(obj);
  this.add({ _id: ObjectId });
};

/**
 * Inherit from EventEmitter.
 */

Schema.prototype.__proto__ = EventEmitter.prototype;

/**
 * Schema by paths
 *
 * Example (embedded doc):
 *    {
 *        'test'       : SchemaType,
 *      , 'test.test'  : SchemaType,
 *      , 'first_name' : SchemaType
 *    }
 *
 * @api private
 */

Schema.prototype.paths;

/**
 * Schema as a tree
 *
 * Example:
 *    {
 *        '_id'     : ObjectId
 *      , 'nested'  : {
 *            'key': String
 *        }
 *    }
 *
 * @api private
 */

Schema.prototype.tree;

/**
 * Sets the keys
 *
 * @param {Object} keys
 * @param {String} prefix
 * @api public
 */

Schema.prototype.add = function (obj, prefix) {
  prefix = prefix || '';
  for (var i in obj){
    // make sure set of keys are in `tree`
    if (!prefix && !this.tree[i])
      this.tree[i] = obj[i];

    if (obj[i].constructor == Object && (!obj[i].type || obj[i].__nested))
      this.add(obj[i], i + '.');
    else
      this.path(prefix + i, obj[i]);
  }
};

/**
 * Sets a path (if arity 2)
 * Gets a path (if arity 1)
 *
 * @param {String} path
 * @param {Object} constructor
 * @api public
 */

Schema.prototype.path = function (path, obj) {
  if (obj == undefined)
    return this.paths[path];

  if (obj.constructor != Object)
    obj = { type: obj };

  var type = obj.type;

  if (Array.isArray(type) || type == Array){
    // if it was specified through { type } look for `cast`
    var cast = type == Array ? obj.cast : type[0];

    if (cast instanceof Schema)
      this.paths[path] = new Types.DocumentArray(path, cast, obj);
    else 
      this.paths[path] = new Types.Array(path, cast, obj);
  } else
    this.paths[path] = new Types[type.name](path, obj);
};

/**
 * Iterates through the schema's paths, passing the path string and type object
 * to the callback.
 *
 * @param {Function} callback function - fn(pathstring, type)
 * @return {Schema} this for chaining
 * @api public
 */

Schema.prototype.eachPath = function (fn) {
  for (var k in this.paths)
    if (this.paths.hasOwnProperty(k))
      fn(k, this.paths[k]);
  return this;
};

/**
 * Adds a method call to the queue
 *
 * @param {String} method name
 * @param {Array} arguments
 * @api private
 */

Schema.prototype.queue = function(name, args){
  this.callQueue.push([name, args]);
  return this;
};

/**
 * Defines a pre for the document
 *
 * @param {String} method
 * @param {Function} callback
 * @api public
 */

Schema.prototype.pre = function(){
  return this.queue('pre', arguments);
};

/**
 * Defines a post for the document
 *
 * @param {String} method
 * @param {Function} callback
 * @api public
 */

Schema.prototype.post = function(method, fn){
  return this.queue('on', arguments);
};

/**
 * Registers a plugin for this schema
 *
 * @param {Function} plugin callback
 * @api public
 */

Schema.prototype.plugin = function (fn) {
  fn(this);
  return this;
};

/**
 * Adds a method
 *
 * @param {String} method name
 * @param {Function} handler
 * @api public
 */

Schema.prototype.method = function (name, fn) {
  this._methods[name] = fn;
  return this;
};

/**
 * Adds several methods
 *
 * @param {Object} handlers by name
 * @api public
 */

Schema.prototype.methods = function (obj) {
  if (obj)
    for (var i in obj)
      this._methods[i] = obj[i];
  return this;
};

/**
 * Defines a static method
 *
 * @param {String} name
 * @param {Function} handler
 * @api public
 */

Schema.prototype.static = function(name, fn) {
  this._statics[name] = fn;
  return this;
};

/**
 * Adds several statics
 *
 * @param {Object} handlers by name
 * @api public
 */

Schema.prototype.statics = function (obj) {
  if (obj)
    for (var i in obj)
      this._statics[i] = obj[i];
  return this;
};

/**
 * Defines an index (most likely compound)
 * Example:
 *    schema.index({ first: 1, last: -1 }, true })
 *
 * @param {Object} field
 * @param {Object} optional options object
 * @api public
 */

Schema.prototype.index = function (fields, options) {
  this._indexes.push([fields, options || {}]);
  return this;
};

/**
 * Compiles indexes from fields and schema-level indexes
 *
 * @api public
 */

Schema.prototype.__defineGetter__('indexes', function () {
  var index
    , indexes = [];
  for (var i in this.paths){
    index = this.paths[i]._index;
    if (index !== false && index !== null){
      var field = {};
      field[i] = 1;
      indexes.push([field, index.constructor == Object ? index : {} ]);
    }
  }
  return indexes.concat(this._indexes);
});

/**
 * ObjectId schema identifier. Not an actual ObjectId, only used for Schemas.
 *
 * @api public
 */

function ObjectId () {
  throw new Error('This is an abstract interface. Its only purpose is to mark '
                + 'fields as ObjectId in the schema creation.');
}

/**
 * Module exports.
 */

module.exports = exports = Schema;

exports.Types = Types;

exports.ObjectId = ObjectId;
