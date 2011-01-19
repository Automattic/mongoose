
/**
 * Module requirements.
 *
 */

var EventEmitter = require('events').EventEmitter
  , MongooseError = require('./error')
  , Schema = require('./schema')
  , ArrayType = require('./types/array')
  , DocumentArraySchema = require('./schema/documentarray');

/**
 * Document constructor.
 *
 * @param {Object} values to set
 * @api private
 */

function Document (obj) {
  this.doc = this.buildDoc();
  if (obj) this.set(obj);
  this.pres = {};
  this.initPaths = {};
  this.modifiedPaths = {};
  this.registerHooks();
  this.doQueue();
  this.saveError = null;
  this.isNew = true;
};

/**
 * Inherit from EventEmitter.
 */

Document.prototype.__proto__ = EventEmitter.prototype;

// TODO Guillermo, do we still need this? If so, it's not in Model.compile.
/**
 * Base Mongoose instance for the model. Set by the Mongoose instance upon
 * pre-compilation.
 *
 * @api public
 */

Document.prototype.base;

/**
 * Document schema as a nested structure.
 *
 * @api public
 */

Document.prototype.schema;

/**
 * Whether the document is new.
 *
 * @api public
 */

Document.prototype.isNew;

/**
 * Builds the default doc structure
 *
 * @api private
 */

Document.prototype.buildDoc = function () {
  var doc = {}
    , paths = this.schema.paths;

  for (var i in paths){
    var path = i.split('.')
      , len = path.length
      , type = paths[i]
      , self = this;

    path.reduce( function (ref, piece, i) {
      if (i === len-1) ref[piece] = type.getDefault(self);
      else return ref[piece] || (ref[piece] = {});
    }, doc);
  }

  return doc;
};

/**
 * Inits (hydrates) the document.
 *
 * @param {Object} document returned by mongo
 * @api private
 */

Document.prototype.init = function (doc, fn, post) {
  var self = this;
  this.isNew = false;

  function init (obj, doc, prefix) {
    prefix = prefix || '';

    for (var i in obj){
      var path = prefix + i;

      if (obj[i].constructor == Object){
        doc[i] = {};
        init(obj[i], doc[i], path + '.');
      } else {
        var schema = self.schema.path(path);
        if (schema)
          self.try(function(){
            doc[i] = schema.cast(obj[i], self);
          });
        else
          doc[i] = obj[i];

        // mark as hydrated
        self.initPaths[path] = true;
      }
    }
  };

  init(doc, self.doc);

  return this;
};

/**
 * Registers a middleware that is executed before a method.
 *
 * @param {String} method name
 * @param {Function} callback
 * @api public
 */

Document.prototype.pre = function (method, fn) {
  if (!(method in this.pres))
    this.pres[method] = {
        serial: []
      , parallel: []
    };
  this.pres[method][fn.length == 1 ? 'serial' : 'parallel'].push(fn);
  return this;
};

/**
 * Sets a path
 *
 * @param {String} key path
 * @param {Object} value
 * @param {Boolean} whether to apply transformations: cast, setters (true) 
 * @param {Boolean} whether to mark dirty (true)
 * @param {Boolean} whether this is an initialization
 * @api public
 */

Document.prototype.set = function (path, val) {
  if (this.getValue(path) !== val) this._markModified(path);

  var schema = this.schema.path(path)
    , parts = path.split('.')
    , obj = this.doc
    , self = this;

  this.try(function(){
    val = schema.cast(val, self);
  });
  for (var i = 0, l = parts.length; i < l-1; i++) obj = obj[parts[i]];
  obj[parts[l-1]] = val;

  return this;
};

Document.prototype._markModified = function (path) {
  this.modifiedPaths[path] = true;
};

/**
 * Gets a raw value from a path (no getters)
 *
 * @param {String} path
 * @api private
 */

Document.prototype.getValue = function (path) {
  var parts = path.split('.')
    , obj = this.doc;

  for (var i = 0, l = parts.length; i < l-1; i++) {
    obj = obj[parts[i]];
    if (!obj) return obj;
  }
  return obj[parts[l-1]];
};

/**
 * Sets a raw value for a path (no casting, setters, transformations)
 *
 * @param {String} path
 * @param {Object} value
 * @api private
 */

Document.prototype.setValue = function (path, val) {
  var parts = path.split('.')
    , obj = this.doc;

  for (var i = 0, l = parts.length; i < l-1; i++) obj = obj[parts[i]];
  obj[parts[l-1]] = val;

  return this;
};

/**
 * Triggers casting on a specific path
 *
 * @param {String} path
 * @api public
 */

Document.prototype.doCast = function (path) {
  var schema = this.schema.path(path);
  if (schema)
    this.setValue(path, this.getValue(path));
};

/**
 * Gets a path
 *
 * @param {String} key path
 * @api public
 */

Document.prototype.get = function (path) {
  var obj = this.doc
    , pieces = path.split('.');

  for (var i = 0, l = pieces.length; i < l; i++)
    obj = obj[pieces[i]];

  // TODO: apply getters here

  return obj;
};

/**
 * Captures an exception that will be bubbled to `save`
 *
 * @param {Function} function to execute
 * @param {Object} scope
 */

Document.prototype.try = function (fn, scope) {
  var res;
  try {
    res = fn.call(scope);
  } catch(e){
    this.error(e);
  };
  return res;
};

/**
 * Checks if a path is modified
 *
 * @param {String} path
 */

Document.prototype.isModified = function (path) {
  return (path in this.modifiedPaths);
};

/**
 * Checks if a certain path was initialized
 *
 * @param {String} path
 */

Document.prototype.isInit = function (path) {
  return (path in this.initPaths);
};

/**
 * Validation middleware
 *
 * @param {Function} next
 * @api private
 */

Document.prototype.validate = function (next) {
  var total = 0
    , didErr = false;

  if (! Object.keys(this.initPaths).length && ! Object.keys(this.modifiedPaths).length) return next();

  var self = this;
  function validatePath (path) {
    total++;
    self.schema.path(path).doValidate(self.getValue(path), function(err){
      if (err) {
        didErr = true;
        return next(err);
      }
      --total || next();
    }, self);
  }

  for (var path in this.initPaths) {
    validatePath(path);
    if (didErr) break;
  }

  for (var path in this.modifiedPaths) {
    validatePath(path);
    if (didErr) break;
  }

  return this;
};

/**
 * Returns if the document has been modified
 *
 * @return {Boolean}
 * @api public
 */

Document.prototype.__defineGetter__('modified', function () {
  return Object.keys(this.modifiedPaths).length;
});

/**
 * Register default hooks
 *
 * @api private
 */

Document.prototype.registerHooks = function () {
  var self = this;

  this.pre('save', function checkForExistingErrors (next) {
    if (self.saveError){
      next(self.saveError);
      self.saveError = null;
    } else {
      next();
    }
  });

  this.pre('save', function validation (next) {
    return self.validate.call(self, next);
  });
};

/**
 * Registers an error
 * TODO: handle multiple
 *
 * @param {Error} error
 * @api private
 */

Document.prototype.error = function (err) {
  this.saveError = err;
  return this;
};

/**
 * Validates a path
 *
 * @param {String} path
 * @param {Object} value
 * @param {Function} callback
 * @api private
 */

Document.prototype.validatePath = function(path, value, fn){
  var validators = this.schema.path(path)._validators
    , interrupt = false
    , passed = validators.length;

  for (var i = 0, val, l = passed; i < l; i++){
    val = validators[i][0];

    if (typeof val == 'function'){
      val.call(this, val, function(err){
        if (!arguments.callee._called && !interrupt){
          if (typeof err == 'string'){
            fn(new ValidatorError(err));
            interrupt = true;
          } else {
            --passed || fn(true);
          }
          arguments.callee._called = true;
        }
      });
    } else if (val instanceof RegExp){
      if (val.test(value))
        --passed || fn(true);
      else {
        interrupt = true;
        fn(new ValidatorError(validators[i][1]));
      }
    }
  }
};

/**
 * Executes methods queued from the Schema definition
 *
 * @api private
 */

Document.prototype.doQueue = function () {
  if ('queue' in this && this.queue.length)
    for (var i = 0, l = this.queue.length; i < l; i++)
      this[this.queue[i][0]].apply(this, this.queue[i][1]);
};

/**
 * Gets the document
 *
 * @return {Object} plain object
 * @api public
 */

Document.prototype.toObject = function () {
  for (var k in this.doc) {
    if (this.doc[k] && this.doc[k].toObject) {
      this.doc[k] = this.doc[k].toObject();
    }
  }
  return this.doc;
};

/**
 * Returns a JSON string for the document
 *
 * @return {String} JSON representation
 * @api public
 */

Document.prototype.toJSON = function () {
  return JSON.stringify(this.toObject());
};

/**
 * Wrap methods for hooks. Should be called on implemented classes (eg: Model)
 * Takes multiple method names as arguments.
 *
 * @api private
 */

function noop () {};

Document.registerHooks = function () {
  for (var i = 0, l = arguments.length; i < l; i++){
    this.prototype[arguments[i]] = (function(methodName, oldFn){
      return function () {
        var self = this
          , args = arguments;

        function error (err){
          var lastArg = args[args.length-1];
          if (typeof lastArg == 'function')
            lastArg.call(self, err);
        }
        var pres = this.pres[methodName];
        if (!pres) return oldFn.apply(this, args);

        var pres = this.pres[methodName]
          , chain = pres.serial.map( function (fn, i) {
              return function (err) {
                if (arguments.callee._hookCalled) return;
                err ? error(err) : fn.call(self, chain[i+1] || parallel);
                arguments.callee._hookCalled = true;
              };
            });

        chain.length ? chain[0]() : parallel();

        function parallel () {
          // chain determines execution, callbacks completeness
          var complete = pres.parallel.length;
          if (!complete) return oldFn.apply(self, args);
            
          function done (err) {
            if (err) return error(err);
            --complete || oldFn.apply(self, args);
          }

          var chain = pres.parallel.map( function (fn, i) {
            return function (err) {
              if (arguments.callee._hookCalled) return;
              if (err) return error(err);
              fn.call(self, chain[i+1] || noop, function (err) {
                if (arguments.callee._hookCalled) return;
                done(err);
                arguments.callee._hookCalled = true;
              });
              arguments.callee._hookCalled = true;
            };
          });
          
          chain[0]();
        }
      };
    })(arguments[i], this.prototype[arguments[i]]);
  }
};

/**
 * Module exports.
 */

module.exports = Document;

/**
 * Document Error
 *
 * @param text
 */

function DocumentError () {
  MongooseError.call(this, msg);
  MongooseError.captureStackTrace(this, arguments.callee);
  this.name = 'DocumentError';
};

/**
 * Inherits from MongooseError.
 */

DocumentError.prototype.__proto__ = MongooseError.prototype;

exports.Error = DocumentError;
