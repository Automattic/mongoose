
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , MongooseError = require('./error');

/**
 * Schema constructor.
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

function SchemaType (key, options) {
  this.key = key;
  this.defaultValue = null;
  this.validators = [];
  this.options = options;
  for (var i in this.options)
    if (i in this && typeof this[i] == 'function')
      this[i].apply(this, this.options[i]);
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
 * @api public
 */

SchemaType.prototype.required = function(required){
  var checkRequired = this.checkRequired.bind(this);

  if (false === required){
    this.validators = this.validators.filter(function(v){
      return v[0] !== checkRequired;
    });
  } else 
    this.validators.push([checkRequired, 'required']);

  return this;
};

/**
 * Gets the default value
 *
 * @param {Function} callback
 * @param {Object} scope
 * @api private
 */

SchemaType.prototype.getDefault = function (fn, scope) {
  if ('function' == typeof this.defaultValue)
    if (1 == this.defaultValue.length)
      this.defaultValue.call(scope, fn);
    else
      fn(null, this.defaultValue.call(scope))
  else
    fn(null, this.defaultValue);
};

/**
 * Performs a validation
 *
 * @param {Function} callback
 * @param {Object} scope
 * @api private
 */

SchemaType.prototype.doValidate = function (value, fn, scope) {
  var err = false
    , count = this.validators.length;

  if (!count) return fn();

  function validate (val, msg){
    if (!err && false === val){
      fn(new ValidatorError(msg));
      err = true;
    } else
      --count || fn();
  };

  this.validators.forEach(function(v){
    var validator = v[0]
      , message = v[1];
    if (validator instanceof RegExp)
      validate(validator.test(value), message);
    else if ('function' == typeof validator)
      if (2 == validator.length)
        validator.call(scope, value, function(val){
          fn(val, message);
        })
      else
        fn(validator.call(scope, value));
  });
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

exports.SchemaType = SchemaType;
