
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , MongooseError = require('./error')
  , Schema = require('./schema')
  , SchemaType = require('./schematype')
  , VirtualType = require('./virtualtype')
  , ArrayType = require('./types/array')
  , MixedSchema = require('./schema/mixed')
  , DocumentArraySchema = require('./schema/documentarray')
  , utils = require('./utils')
  , clone = utils.clone
  , ActiveRoster = utils.StateMachine.ctor('require', 'modify', 'init');

/**
 * Document constructor.
 *
 * @param {Object} values to set
 * @api private
 */

function Document (obj) {
  this.doc = this.buildDoc();
  this.activePaths = new ActiveRoster();
  var self = this;
  this.schema.requiredPaths.forEach( function (path) {
    self.activePaths.require(path);
  });
  this.saveError = null;
  if (obj) this.set(obj);
  this.pres = {};
  this.registerHooks();
  this.doQueue();
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
 * @api private
 */

Document.prototype.buildDoc = function () {
  var doc = {}
    , self = this;

  this.schema.eachPath( function (i, type) {
    var path = i.split('.')
      , len = path.length;

    path.reduce( function (ref, piece, i) {
      var _default;
      if (i === len-1) {
        _default = type.getDefault(self);
        if ('undefined' !== typeof _default)
          ref[piece] = _default;
      } else
        return ref[piece] || (ref[piece] = {});
    }, doc);
  });

  return doc;
};

/**
 * Inits (hydrates) the document.
 *
 * @param {Object} document returned by mongo
 * @api private
 */

Document.prototype.init = function (doc, fn) {
  var self = this;
  this.isNew = false;

  function init (obj, doc, prefix) {
    prefix = prefix || '';

    for (var i in obj){
      var path = prefix + i
        , schema = self.schema.path(path);

      if (!schema && obj[i].constructor == Object){ // assume nested object
        doc[i] = {};
        init(obj[i], doc[i], path + '.');
      } else {
        if (obj[i] !== null && obj[i] !== undefined) {
          var schema = self.schema.path(path);

          if (schema)
            self.try(function(){
              doc[i] = schema.cast(obj[i], self);
            });
          else
            doc[i] = obj[i];
        }

        // mark as hydrated
        self.activePaths.init(path);
      }
    }
  };

  init(doc, self.doc);

  if (fn)
    fn(null);

  this.emit('init');

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
 * Sets a path, or many paths
 *
 * Examples:
 *     // path, value
 *     doc.set(path, value)
 *
 *     // object
 *     doc.set({
 *         path  : value
 *       , path2 : {
 *            path  : value
 *         }
 *     }
 *
 * @param {String/Object} key path, or object
 * @param {Object} value, or undefined if first parameter is an object
 * @param {Boolean} whether to apply transformations: cast, setters (true) 
 * @param {Boolean} whether to mark dirty (true)
 * @param {Boolean} whether this is an initialization
 * @api public
 */

Document.prototype.set = function (path, val) {
  if (typeof path != 'string'){
    var prefix = val ? val + '.' : '';
    for (var i in path){
      if (!(this.schema.path(prefix + i) instanceof MixedSchema)
        && 'undefined' !== typeof path[i]
        && path[i] !== null
        && path[i].constructor == Object) {
        this.set(path[i], prefix + i);
      } else if ('undefined' !== typeof path[i]) {
        this.set(prefix + i, path[i]);
      }
    }
  } else {
    // TODO: do actual checking to see if the value changed
    var schema = this.schema.path(path)
      , parts = path.split('.')
      , obj = this.doc
      , self = this;

    if (this.schema.pathType(path) === 'virtual') {
      schema = this.schema.virtualpath(path);
      schema.applySetters(val, this);
      return this;
    }

    this.activePaths.modify(path);

    if ( (!schema || val === null || val === undefined) || 
      this.try(function(){
        val = schema.applySetters(schema.cast(val, self), self);
      })
    ){
      for (var i = 0, l = parts.length; i < l; i++){
        if (i + 1 == l)
          obj[parts[i]] = val;
        else {
          obj = obj[parts[i]];
        }
      }
    }
  }

  return this;
};

Document.prototype._markModified = function (path) {
  this.activePaths.modify(path);
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
  var obj
    , schema = this.schema.path(path) || this.schema.virtualpath(path)
    , pieces = path.split('.');

  obj = this.doc;
  for (var i = 0, l = pieces.length; i < l; i++)
    obj = obj[pieces[i]];
  
  if (schema)
    obj = schema.applyGetters(obj, this);
    // TODO Cache obj

  return obj;
};

/**
 * Commits a path, marking as modified if needed. Useful for mixed keys
 *
 * @api public
 */

Document.prototype.commit = function (path) {
  // TODO: do actual checking to see if the value changed
  this.activePaths.modify(path);
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
    fn.call(scope);
    res = true;
  } catch(e){
    this.error(e);
    res = false;
  };
  return res;
};

/**
 * Checks if a path is modified
 *
 * @param {String} path
 */

Document.prototype.isModified = function (path) {
  return (path in this.activePaths.states.modify);
};

/**
 * Checks if a certain path was initialized
 *
 * @param {String} path
 */

Document.prototype.isInit = function (path) {
  return (path in this.activePaths.states.init);
};

/**
 * Validation middleware
 *
 * @param {Function} next
 * @api private
 */

Document.prototype.validate = function (next) {
  var total = 0
    , self = this
    , validating = {}
    , didErr = false;

  if (!this.activePaths.some('require', 'init', 'modify')) return next();

  function validatePath (path) {
    if (validating[path]) return;
    total++;
    process.nextTick(function(){
      self.schema.path(path).doValidate(self.getValue(path), function(err){
        if (err) {
          didErr = true;
          return next(err);
        }
        --total || next();
      }, self);
    });
    validating[path] = true;
  }

  this.activePaths.forEach('require', 'init', 'modify', function (path) {
    if (!didErr) validatePath(path);
  });

  return this;
};

/**
 * Returns if the document has been modified
 *
 * @return {Boolean}
 * @api public
 */

Document.prototype.__defineGetter__('modified', function () {
  return this.activePaths.some('modified');
});

/**
 * We override the schema setter to compile accessors
 *
 * @api private
 */

function compile (tree, proto, prefix) {
  for (var i in tree)
    define(i, ((tree[i].constructor == Object
               && Object.keys(tree[i]).length)
               && (!tree[i].type || tree[i].__nested)
               ? tree[i]
               : null)
            , proto
            , prefix);
};

function define (prop, subprops, prototype, prefix) {
  var prefix = prefix || ''
    , path = (prefix ? prefix + '.' : '') + prop;

  if (subprops) {
    // if prop hasn't been defined
    prototype.__defineGetter__(prop, function () {
      if (!this.__getters)
        this.__getters = {};

      if (!this.__getters[path]){
        var nested = function(){};
        nested.prototype.__proto__ = this;
        compile(subprops, nested.prototype, path);
        this.__getters[path] = new nested();
      }

      return this.__getters[path];
    });
  } else {
    prototype.__defineGetter__(prop, function () {
      return this.get(path);
    });

    prototype.__defineSetter__(prop, function (v) {
      return this.set(path, v);
    });
  }
};

Document.prototype.__defineSetter__('schema', function (schema) {
  compile(schema.tree, this);
  this._schema = schema;
});

/**
 * We override the schema getter to return the internal reference
 *
 * @api private
 */

Document.prototype.__defineGetter__('schema', function () {
  return this._schema;
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
 * Executes methods queued from the Schema definition
 *
 * @api private
 */

Document.prototype.doQueue = function () {
  if (this.schema && this.schema.callQueue)
    for (var i = 0, l = this.schema.callQueue.length; i < l; i++)
      this[this.schema.callQueue[i][0]].apply(this, this.schema.callQueue[i][1]);
  return this;
};

/**
 * Gets the document
 *
 * @todo Should we apply getters?
 * @return {Object} plain object
 * @api public
 */


Document.prototype.toObject = function () {
  return clone(this.doc, true);
};

/**
 * Returns a JSON string for the document
 *
 * @return {String} JSON representation
 * @api public
 */

Document.prototype.toJSON = function () {
  return this.toObject();
};

/**
 * Returns true if the Document stores the same data as doc.
 * @param {Document} doc to compare to
 * @return {Boolean}
 * @api public
 */
Document.prototype.equals = function (doc) {
  return this.get('_id') === doc.get('_id');
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
          , chain = pres.serial.map(function (fn, i) {
              return function (err) {
                if (arguments.callee._hookCalled) return;

                if (err instanceof Error)
                  error(err);
                else
                  fn.call(self, chain[i+1] || parallel);

                arguments.callee._hookCalled = true;
              };
            });

        chain.length ? chain[0]() : parallel();

        function parallel (err) {
          if (err instanceof Error)
            return error(err);

          // chain determines execution, callbacks completeness
          var complete = pres.parallel.length;
          if (!complete) return oldFn.apply(self, args);
            
          function done (err) {
            if (err instanceof Error)
              return error(err);
            --complete || oldFn.apply(self, args);
          }

          var chain = pres.parallel.map(function (fn, i) {
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
