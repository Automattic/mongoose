
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , MongooseError = require('./error');

/**
 * Schema constructor
 *
 * @param {Function} class constructor
 * @param {Mongoose} base mongoose
 * @api public
 */

function Schema (ctor, base) {
  this.ctor = ctor;
  this.base = base;
  this.paths = {};
  this.inherits = {};
  this._methodQueue = [];
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
 * Returns true if the path is an embedded doc
 *
 * @param text
 */


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
 * Gets a SchemaType by path
 *
 */

Schema.prototype.get = function (path) {
  return this.paths[path];
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
 * SchemaType constructor
 *
 * @param {String} key name
 * @api public
 */

function SchemaType (key) {
  this.key = key;
  this.defaultValue = null;
  this.validators = [];
  this.isRequired = false;
};

/**
 * Base schema. Set by Schema when instantiated.
 *
 * @api private
 */

SchemaType.prototype.base;

/**
 * Sets a default
 *
 * @param {Object} default value
 * @api public
 */

SchemaType.prototype.default = function (val) {
  this.defaultValue = val;
  return this;
};

/**
 * Adds a validator
 *
 * @param {Object} validator
 * @param {String} optional error message
 * @api public
 */

SchemaType.prototype.validate = function(obj, error){
  this.validators.push([obj, error]);
  return this;
};

/**
 * Adds a required validator
 *
 * @param {Boolean} enable/disable the validator
 * @parma {String} optional error message
 * @api public
 */

SchemaType.prototype.required = function(required, msg){
  if (!required){
    this.validators = this.validators.filter(function(v){
      return v !== checkRequired;
    });
    this.isRequired = false;
  } else {
    this.validators.push(checkRequired);
    this.isRequired = true;
  }
  return this;
};

function checkRequired (val) {
  return val !== undefined && val !== null;
};

/**
 * Validator error
 *
 * @api private
 */

function ValidatorError () {
  MongooseError.call(this, msg);
  MongooseError.captureStackTrace(this, arguments.callee);
  this.name = 'ValidatorError';
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

exports.SchemaType = SchemaType;
