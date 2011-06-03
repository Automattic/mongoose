
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , MongooseError = require('./error')
  , MixedSchema = require('./schema/mixed')
  , Schema = require('./schema')
  , utils = require('./utils')
  , clone = utils.clone
  , inspect = require('util').inspect
  , ActiveRoster = utils.StateMachine.ctor('require', 'modify', 'init')
  , deepEqual = utils.deepEqual
  , hooks = require('hooks');

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
  this.isNew = true;
  if (obj) this.set(obj);
  this.registerHooks();
  this.doQueue();
  this.errors = undefined;
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

    var keys = Object.keys(obj)
      , len = keys.length
      , i;

    while (len--) {
      i = keys[len];
      var path = prefix + i
        , schema = self.schema.path(path);

      if (!schema && obj[i] && obj[i].constructor == Object){ // assume nested object
        doc[i] = {};
        init(obj[i], doc[i], path + '.');
      } else {
        if (obj[i] === null) {
          doc[i] = null;
        } else if (obj[i] !== undefined) {
          if (schema) {
            self.try(function(){
              doc[i] = schema.cast(obj[i], self);
            });
          } else {
            doc[i] = obj[i];
          }
        }
        // mark as hydrated
        self.activePaths.init(path);
      }
    }
  };

  init(doc, self.doc);

  this.emit('init');

  if (fn)
    fn(null);

  return this;
};

// Set up middleware support
for (var k in hooks) {
  Document.prototype[k] = Document[k] = hooks[k];
}

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
 * @param {Object} value, or undefined or a prefix if first parameter is an object
 * @param @optional {Schema|String|...} specify a type if this is an on-the-fly attribute
 * @api public
 */

Document.prototype.set = function (path, val, type) {
  var adhocs;
  if (type) {
    adhocs = this._adhocPaths || (this._adhocPaths = {});
    adhocs[path] = Schema.interpretAsType(path, type);
  }

  if ('string' !== typeof path) {

    if (null === path || undefined === path)
      return this.set(val, path);

    var prefix = val
      ? val + '.'
      : '';

    if (path instanceof Document) {
      path = path.doc;
    }

    var keys = Object.keys(path);
    var i = keys.length;
    var key;

    while (i--) {
      key = keys[i];
      if (!(this._path(prefix + key) instanceof MixedSchema)
        && undefined !== path[key]
        && null !== path[key]
        && Object == path[key].constructor) {
        this.set(path[key], prefix + key);
      } else if (undefined !== path[key]) {
        this.set(prefix + key, path[key]);
      }
    }

    return this;
  }

  var schema = this._path(path)
    , parts = path.split('.')
    , obj = this.doc
    , self = this;

  if (this.schema.pathType(path) === 'virtual') {
    schema = this.schema.virtualpath(path);
    schema.applySetters(val, this);
    return this;
  }

  // When using the $set operator the path to the field must already exist.
  // Else mongodb throws: "LEFT_SUBFIELD only supports Object"
  var pathToMark
    , subpaths, subpath;
  if (parts.length <= 1) {
    pathToMark = path;
  } else {
    subpaths = parts.map( function (part, i) {
      return parts.slice(0, i).concat(part).join('.');
    });
    for (var i = 0, l = subpaths.length; i < l; i++) {
      subpath = subpaths[i];
      if (this.isDirectModified(subpath) // earlier prefixes that are already
                                   // marked as dirty have precedence
          || this.get(subpath) === null) {
        pathToMark = subpath;
        break;
      }
    }
    if (!pathToMark) pathToMark = path;
  }
  var markedModified = this.isDirectModified(pathToMark);

  if ( (!schema || null === val || undefined === val) || 
    this.try(function(){
      val = schema.applySetters(schema.cast(val, self), self);
    })
  ){
    var priorVal = this.get(path);
    if (!markedModified && !deepEqual(val, this.get(path))) {
      this.activePaths.modify(pathToMark);
    }
    for (var i = 0, l = parts.length; i < l; i++) {
      if (i + 1 == l) {
        obj[parts[i]] = val;
      } else {
        obj = obj[parts[i]] || (obj[parts[i]] = {});
      }
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
    , obj = this.doc
    , part;

  for (var i = 0, l = parts.length; i < l-1; i++) {
    part = parts[i];
    path = convertIfInt(path);
    obj = obj.getValue 
        ? obj.getValue(part) // If we have an embedded array document member
        : obj[part];
    if (!obj) return obj;
  }
  part = parts[l-1];
  path = convertIfInt(path);
  return obj.getValue 
    ? obj.getValue(part) // If we have an embedded array document member
    : obj[part];
};

function convertIfInt (string) {
  if (/^\d+$/.test(string)) {
    return parseInt(string, 10);
  }
  return string;
}

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
 * @param @optional {Schema|String|...} specify a type if this is an on-the-fly attribute
 * @api public
 */

Document.prototype.get = function (path, type) {
  var adhocs;
  if (type) {
    adhocs = this._adhocPaths || (this._adhocPaths = {});
    adhocs[path] = Schema.interpretAsType(path, type);
  }
  var obj
    , schema = this._path(path) || this.schema.virtualpath(path)
    , adhocs
    , pieces = path.split('.');

  obj = this.doc;
  for (var i = 0, l = pieces.length; i < l; i++)
    obj = null === obj ? null : obj[pieces[i]];
  
  if (schema) {
    obj = schema.applyGetters(obj, this);
  }
    // TODO Cache obj

  return obj;
};

/**
 * Finds the path in the ad hoc type schema list or
 * in the schema's list of type schemas
 * @param {String} path
 * @param {Object} obj
 * @api private
 */

Document.prototype._path = function (path, obj) {
  var adhocs = this._adhocPaths
    , adhocType = adhocs && adhocs[path];
  if (adhocType) {
    return adhocType;
  } else {
    return this.schema.path(path);
  }
};

/**
 * Commits a path, marking as modified if needed. Useful for mixed keys
 *
 * @api public
 */

Document.prototype.markModified =
Document.prototype.commit = function (path) {
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
 * Checks if a path or any full path containing path as part of
 * its path chain has been directly modified.
 *
 * e.g., if we set `documents.0.title` to 'newTitle'
 *       then we have directly modified `documents.0.title`
 *       but not directly modified `documents` or `documents.0`.
 *       Nonetheless, we still say `documents` and `documents.0`
 *       are modified. They just are not considered direct modified.
 *       The distinction is important because we need to distinguish
 *       between what has been directly modified and what hasn't so
 *       that we can determine the MINIMUM set of dirty data
 *       that we want to send to MongoDB on a Document save.
 *
 * @param {String} path
 */

Document.prototype.isModified = function (path) {
  var directModifiedPaths = Object.keys(this.activePaths.states.modify);

  var allPossibleChains = directModifiedPaths.reduce(function (list, path) {
    var parts = path.split('.');
    return list.concat(parts.reduce(function (chains, part, i) {
      return chains.concat(parts.slice(0, i).concat(part).join('.'));
    }, []));
  }, []);

  return !!~allPossibleChains.indexOf(path);
};

/**
 * Checks if a path has been directly set and modified. False if
 * the path is only part of a larger path that was directly set.
 *
 * e.g., if we set `documents.0.title` to 'newTitle'
 *       then we have directly modified `documents.0.title`
 *       but not directly modified `documents` or `documents.0`.
 *       Nonetheless, we still say `documents` and `documents.0`
 *       are modified. They just are not considered direct modified.
 *       The distinction is important because we need to distinguish
 *       between what has been directly modified and what hasn't so
 *       that we can determine the MINIMUM set of dirty data
 *       that we want to send to MongoDB on a Document save.
 *
 * @param {String} path
 */

Document.prototype.isDirectModified = function (path) {
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
    , validationError = null;

  if (!this.activePaths.some('require', 'init', 'modify'))
    return next();

  function validatePath (path) {
    if (validating[path]) return;
    total++;
    process.nextTick(function(){
      var p = self.schema.path(path);
      if (!p) return --total || next();

      p.doValidate(self.getValue(path), function (err) {
        if (err) {
          validationError = validationError || new ValidationError(self);
          validationError.errors[err.path] = err.message;
        }
        --total || 
          (validationError ? next(validationError) : next());
      });

    });
    validating[path] = true;
  }

  this.activePaths.forEach('require', 'init', 'modify', function (path) {
    validatePath(path);
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
  return this.activePaths.some('modify');
});

/**
 * We override the schema setter to compile accessors
 *
 * @api private
 */

function compile (tree, proto, prefix) {
  var keys = Object.keys(tree)
    , i = keys.length
    , limb
    , key;

  while (i--) {
    key = keys[i];
    limb = tree[key];

    define(key
        , ((limb.constructor == Object
               && Object.keys(limb).length)
               && (!limb.type || limb.type.type)
               ? limb
               : null)
        , proto
        , prefix);
  }
};

function define (prop, subprops, prototype, prefix) {
  var prefix = prefix || ''
    , path = (prefix ? prefix + '.' : '') + prop;

  if (subprops) {

    Object.defineProperty(prototype, prop, {
        enumerable: true
      , get: function ( ) {
          if (!this.__getters)
            this.__getters = {};

          if (!this.__getters[path]) {
            var nested = function(){};
            nested.prototype.__proto__ = this;
            nested.prototype.toObject = function () {
              return this.get(path);
            };
            compile(subprops, nested.prototype, path);
            this.__getters[path] = new nested();
          }

          return this.__getters[path];
        }
      , set: function (v) {
          return this.set(v, path);
        }
    });

  } else {

    Object.defineProperty(prototype, prop, {
        enumerable: true
      , get: function ( ) { return this.get(path); }
      , set: function (v) { return this.set(path, v); }
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

  if (!this.save) return;

  this.pre('save', function checkForExistingErrors (next) {
    if (self.saveError){
      next(self.saveError);
      self.saveError = null;
    } else {
      next();
    }
  }).pre('save', function validation (next) {
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
    for (var i = 0, l = this.schema.callQueue.length; i < l; i++) {
      this[this.schema.callQueue[i][0]].apply(this, this.schema.callQueue[i][1]);
    }
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
 * Helper for console.log
 *
 * @api public
 */

Document.prototype.inspect = function () {
  return inspect(this.doc);
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
 * Module exports.
 */

module.exports = Document;

/**
 * Document Validation Error
 */

function ValidationError (instance) {
  MongooseError.call(this, "Validation failed");
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ValidationError';
  this.errors = instance.errors = {};
};

ValidationError.prototype.toString = function () {
  return this.name + ': ' + Object.keys(this.errors).map(function (key) {
    return this.errors[key];
  }, this).join(', ');
};

/**
 * Inherits from MongooseError.
 */

ValidationError.prototype.__proto__ = MongooseError.prototype;

Document.ValidationError = ValidationError;

/**
 * Document Error
 *
 * @param text
 */

function DocumentError () {
  MongooseError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'DocumentError';
};

/**
 * Inherits from MongooseError.
 */

DocumentError.prototype.__proto__ = MongooseError.prototype;

exports.Error = DocumentError;
