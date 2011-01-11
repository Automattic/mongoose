
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , MongooseError = require('./error')
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
  this._methodQueue = [];
  if (obj) this.add(obj);
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
 */

Schema.prototype.add = function (obj, prefix) {
  prefix = prefix || '';
  for (var i in obj)
    if (obj[i].constructor == Object && (!obj[i].type || obj[i].__nested))
      this.add(obj[i], i + '.');
    else
      this.path(prefix + obj, obj[i]);
};

/**
 * Sets a path
 *
 * @param {String} path
 * @param {Object} constructor
 */

Schema.prototype.path = function (path, obj) {
  if (obj == undefined)
    return this.paths[path];
  if (obj.constructor != Object)
    obj = { type: obj };
  this.path[path] = new Types[obj.type.name];
};

/**
 * Adds a method call to the queue
 *
 * @param {String} method name
 * @param {Array} arguments
 * @api private
 */

Schema.prototype._queue = function(name, args){
  this._methodQueue.push([name, args]);
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
  return this._queue('pre', arguments);
};

/**
 * Defines a post for the document
 *
 * @param {String} method
 * @param {Function} callback
 * @api public
 */

Schema.prototype.post = function(method, fn){
  return this._queue('on', arguments);
};

/**
 * Sets an inherited function
 *
 * @param text
 */

Schema.prototype.inherit = function(method, fn){

};

/**
 * Description
 *
 * @param text
 */

Schema.prototype.static = function(name, fn) {
  // body...
};

/**
 * Validator error
 *
 * @param {String} key
 * @param {String} msg
 * @api private
 */

function ValidatorError (key, msg) {
  MongooseError.call(this, msg);
  MongooseError.captureStackTrace(this, arguments.callee);
  this.name = 'ValidatorError';
  this.key = key;
};

/**
 * Inherits from MongooseError
 */

ValidatorError.prototype.__proto__ = MongooseError.prototype;

/**
 * Cast error
 *
 * @api private
 */

function CastError (type, value) {
  MongooseError.call(this, val);
  MongooseError.captureStackTrace(this, arguments.callee);
  this.name = 'CastError';
  this.type = type;
  this.value = value;
};

/**
 * Inherits from MongooseError.
 */

CastError.prototype.__proto__ = MongooseError.prototype;

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

exports.ObjectId = ObjectId;

exports.CastError = CastError;

exports.ValidatorError = ValidatorError;
