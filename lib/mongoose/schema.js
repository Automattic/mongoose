
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
 *    { 'test' => SchemaType,
 *      'test.test' => SchemaType,
 *      'first_name' => SchemaType }
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

  if (Array.isArray(obj.type) || obj.type == Array){
    // if it was specified through { type } look for `cast`
    var cast = obj.type == Array ? obj.cast : obj.type[0];

    if (cast instanceof Schema)
      this.paths[path] = new Types.DocumentArray(path, cast, obj);
    else 
      this.paths[path] = new Types.Array(path, cast, obj);
  } else
    this.paths[path] = new Types[obj.type.name](path, obj);
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
  for (var k in this.paths) {
    fn(k, this.paths[k]);
  }
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
 * Adds one or more methods
 *
 * @param {String|Object} method name | handlers by method name
 * @param {Function|undefined} handler
 * @api public
 */

Schema.prototype.method = function (name, fn) {
  var numArgs = arguments.length;
  if (numArgs === 2) {
    this._methods[name] = fn;
  } else if (numArgs === 1) {
    var obj = name;
    for (var k in obj) this.method(k, obj[k]);
  } else {
    throw new Error("Argument Error - Wrong number of arguments. Expected 1 or 2 arguments but got " + numArgs + " arguments.");
  }
  return this;
};


/**
 * Defines one or more static methods
 *
 * @param {String|Object} static method name | handlers by static method name
 * @param {Function|undefined} handler
 * @api public
 */

Schema.prototype.static = function (name, fn) {
  var numArgs = arguments.length;
  if (numArgs === 2) {
    this._statics[name] = fn;
  } else if (numArgs === 1) {
    var obj = name;
    for (var k in obj) this.static(k, obj[k]);
  } else {
    throw new Error("Argument Error - Wrong number of arguments. Expected 1 or 2 arguments but got " + numArgs + " arguments.");
  }
  return this;
};

/**
 * ObjectId schema identifier. Not an actual ObjectId, only used for Schemas.
 *
 * @api public
 */

function ObjectId (){
  throw new Error('This is an abstract interface. Its only purpose is to mark '
                + 'fields as ObjectId in the schema creation.');
};

/**
 * Module exports.
 */

module.exports = exports = Schema;

exports.Types = Types;

exports.ObjectId = ObjectId;
