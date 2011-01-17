
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
  if (obj) this.set(obj);
  this.doc = this.buildDoc();
  this.pres = {};
  this.hydratedPaths = {};
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
 * @param api private
 */

Document.prototype.buildDoc = function () {
  var doc = {};

  for (var i in this.schema.paths){
    var path = i.split('.')
      , type = this.schema.paths[i]
      , cast = type.cast
      , obj = doc
      , last = null;

    for (var a = 0, l = path.length; a < l; a++){
      if (a + 1 == l){
        if (last)
          last[path[a]] = type.initValue();
        else
          obj[path[a]] = type.initValue();
      } else {
        if (!(path[a] in obj))
          obj[path[a]] = {};
        last = obj[path[a]];
      }
    }
  };

  return doc;
};

/**
 * Inits (hydrates) the document.
 *
 * @param {Object} document returned by mongo
 * @api private
 */

Document.prototype.init = function (doc) {
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
  this.modifiedPaths[path] = true;

  var schema = this.schema.path(path)
    , parts = path.split('.')
    , obj = this.doc
    , self = this;

  if (
    this.try(function(){
      val = schema.cast(val, self);
    })
  ){
    for (var i = 0, l = parts.length; i < l; i++){
      if (i + 1 == l)
        obj[parts[i]] = val;
      else 
        obj = obj[parts[i]];
    }
  }

  return this;
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

  for (var i = 0, l = parts.length; i < l; i++){
    if (i + 1 == l)
      return obj[parts[i]];
    else 
      obj = obj[parts[i]];
  }
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

  for (var i = 0, l = parts.length; i < l; i++){
    if (i + 1 == l)
      obj[parts[i]] = val;
    else 
      obj = obj[parts[i]];
  }

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
  try {
    fn.call(scope);
  } catch(e){
    this.saveError = e;
  };
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
 * Apply defaults middleware
 *
 * @param {Function} next
 * @api private
 */

Document.prototype.applyDefaults = function (next) {
  if (this.isNew){
    var total = 0
      , self = this;

    for (var i in this.hydratedPaths){
      if (!(i in this.modifiedPaths)){
        if (this.schema.get(i) instanceof DocumentArraySchema){
          total++;
          (function(i){
            process.nextTick(function () {
              self.get(i).applyDefaults(function () {
                --total || next();
              });
            });
          })(i);
        } else {
          var def = this.schema.get(i)._default;
          if (typeof def == 'function') {
            if (def.length > 0){
              total++;
              process.nextTick(function () {
                def.call(this, function () {
                  --total || next();
                });
              });
            } else {
              this.set(i, this.schema.get(i)._default(), true, false);
            }
          } else {
            this.set(i, this.schema.get(i)._default, true, false);
          }
        }
      }
    }
  } else {
    next();
  }
};

/**
 * Validation middleware
 *
 * @param {Function} next
 * @api private
 */

Document.prototype.validate = function (next) {
  var total = 0
    , paths = Object.keys(this.hydratedPaths)
    , self = this;

  if (paths.length){

  } else {
    next();
  }

  for (var i in this.hydratedPaths){
    if (this.schema.get(i) instanceof SubdocsArrayType){
      total++;
      (function(i){
        process.nextTick(function(){
          self.get(i).validate(function(err){
            if (err){
              next(err);
            }
          });
        });
      })(i);
    } else {
      
    }
  }
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

  // check for existing errors
  this.pre('save', function (next) {
    if (self.saveError){
      next(self.saveError);
      self.saveError = null;
    } else {
      next();
    }
  });

  // apply defaults
  this.pre('save', this.applyDefaults.bind(this));

  // validation
  this.pre('save', this.validate.bind(this));
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
  var validators = this.schema.paths[path]._validators
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

Document.registerHooks = function () {
  for (var i = 0, l = arguments.length; i < l; i++){
    this.prototype[arguments[i]] = (function(method, oldFn){
      return function () {
        var self = this
          , args = arguments;

        function error(){
          if (typeof args[0] == 'function')
            args[0].call(self, err);
        };

        if (method in this.pres){
          var pres = this.pres[method]
            , chain = [];

          if (pres.serial.length){
            pres.serial.forEach(function (fn, i) {
              chain.push(function (err) {
                err ? error() : fn.call(self, chain[i + 1] || parallel);
              });
            });

            chain[0]();
          } else {
            return parallel();
          }

          function parallel () {
            // chain determines execution, callbacks completeness
            var complete = pres.parallel.length;
            if (complete){
              var chain = [];
              
              function done () {
                --complete || oldFn.apply(self, args);
              };

              pres.parallel.forEach(function (fn) {
                chain.push(function (err) {
                  err ? error() : fn.call(self, chain[i + 1], done);
                });
              });

              chain[0]();
            } else {
              return oldFn.apply(self, args);
            }
          };
        } else {
          return oldFn.apply(this, arguments);
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
