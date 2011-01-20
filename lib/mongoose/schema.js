
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
  this._methods = {};
  this._statics = {};
  if (obj) this.add(obj);
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
 *        'test' => SchemaType,
 *      , 'test.test' => SchemaType,
 *      , 'first_name' => SchemaType
 *    }
 *
 * @api private
 */

Schema.prototype.paths;

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
