
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , MongooseError = require('./error')
  , MixedSchema = require('./schema/mixed')
  , Schema = require('./schema')
  , ValidatorError = require('./schematype').ValidatorError
  , utils = require('./utils')
  , clone = utils.clone
  , inspect = require('util').inspect
  , StateMachine = require('./statemachine')
  , ActiveRoster = StateMachine.ctor('require', 'modify', 'init')
  , deepEqual = utils.deepEqual
  , hooks = require('hooks')
  , DocumentArray

/**
 * Document constructor.
 *
 * @param {Object} values to set
 * @api private
 */

function Document (obj, fields) {
  // node <0.4.3 bug
  if (!this._events) this._events = {};
  this.setMaxListeners(0);

  this._doc = this.buildDoc(fields);
  this._activePaths = new ActiveRoster();
  var self = this;
  this.schema.requiredPaths.forEach(function (path) {
    self._activePaths.require(path);
  });

  this._saveError = null;
  this._validationError = null;
  this.isNew = true;

  if (obj) this.set(obj);

  this._registerHooks();
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
 * Validation errors.
 *
 * @api public
 */

Document.prototype.errors;

/**
 * Builds the default doc structure
 *
 * @api private
 */

Document.prototype.buildDoc = function (fields) {
  var doc = {}
    , self = this
    , exclude
    , keys
    , key
    , ki

  // determine if this doc is a result of a query with
  // excluded fields
  if (fields && 'Object' === fields.constructor.name) {
    keys = Object.keys(fields);
    ki = keys.length;

    while (ki--) {
      if ('_id' !== keys[ki]) {
        exclude = 0 === fields[keys[ki]];
        break;
      }
    }
  }

  this.schema.eachPath(function (p, type) {
    var path = p.split('.')
      , len = path.length
      , last = len-1

    path.reduce(function (doc, piece, i) {
      var def;
      if (i === last) {
        if (fields) {
          if (exclude) {
            // apply defaults to all non-excluded fields
            if (p in fields) return;

            def = type.getDefault(self);
            if ('undefined' !== typeof def) doc[piece] = def;

          } else {
            // do nothing. only the fields specified in
            // the query specified will be populated
          }
        } else {
          def = type.getDefault(self);
          if ('undefined' !== typeof def) doc[piece] = def;
        }
      } else {
        return doc[piece] || (doc[piece] = {});
      }
    }, doc);
  });

  return doc;
};

/**
 * Inits (hydrates) the document without setters.
 *
 * Called internally after a document is returned
 * from mongodb.
 *
 * @param {Object} document returned by mongo
 * @param {Function} callback
 * @api private
 */

Document.prototype.init = function (doc, fn) {
  this.isNew = false;

  init(this, doc, this._doc);
  this.emit('init');

  if (fn)
    fn(null);

  return this;
};

/**
 * Init helper.
 * @param {Object} instance
 * @param {Object} obj - raw mongodb doc
 * @param {Object} doc - object we are initializing
 * @private
 */

function init (self, obj, doc, prefix) {
  prefix = prefix || '';

  var keys = Object.keys(obj)
    , len = keys.length
    , schema
    , path
    , i;

  while (len--) {
    i = keys[len];
    path = prefix + i;
    schema = self.schema.path(path);

    if (!schema && obj[i] && 'Object' === obj[i].constructor.name) {
      // assume nested object
      doc[i] = {};
      init(self, obj[i], doc[i], path + '.');
    } else {
      if (obj[i] === null) {
        doc[i] = null;
      } else if (obj[i] !== undefined) {
        if (schema) {
          self.try(function(){
            doc[i] = schema.cast(obj[i], self, true);
          });
        } else {
          doc[i] = obj[i];
        }
      }
      // mark as hydrated
      self._activePaths.init(path);
    }
  }
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
 * @param {String|Object} key path, or object
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
      path = path._doc;
    }

    var keys = Object.keys(path);
    var i = keys.length;
    var key;

    while (i--) {
      key = keys[i];
      if (!(this._path(prefix + key) instanceof MixedSchema)
        && undefined !== path[key]
        && null !== path[key]
        && 'Object' == path[key].constructor.name) {
        this.set(path[key], prefix + key);
      } else if (undefined !== path[key]) {
        this.set(prefix + key, path[key]);
      }
    }

    return this;
  }

  var schema = this._path(path)
    , parts = path.split('.')
    , obj = this._doc
    , self = this;

  if (this.schema.pathType(path) === 'virtual') {
    schema = this.schema.virtualpath(path);
    schema.applySetters(val, this);
    return this;
  }

  // When using the $set operator the path to the field must already exist.
  // Else mongodb throws: "LEFT_SUBFIELD only supports Object"
  var pathToMark
    , subpaths
    , subpath;

  if (parts.length <= 1) {
    pathToMark = path;
  } else {
    subpaths = parts.map(function (part, i) {
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

  if ((!schema || null === val || undefined === val) ||
    this.try(function(){
      var casted = schema.cast(val, self, false, self.get(path));
      val = schema.applySetters(casted, self);
    })) {

    if (this.isNew) {
      this.markModified(pathToMark);
    } else {
      var priorVal = this.get(path);
      if (!this.isDirectModified(pathToMark) && !deepEqual(val, priorVal)) {
        this.markModified(pathToMark);
      }
    }

    for (var i = 0, l = parts.length; i < l; i++) {
      var next = i + 1
        , last = next === l;

      if (last) {
        obj[parts[i]] = val;
      } else {
        if (obj[parts[i]] && 'Object' === obj[parts[i]].constructor.name) {
          obj = obj[parts[i]];
        } else if (obj[parts[i]] && Array.isArray(obj[parts[i]])) {
          obj = obj[parts[i]];
        } else {
          obj = obj[parts[i]] = {};
        }
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
    , obj = this._doc
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
    , obj = this._doc;

  for (var i = 0, l = parts.length; i < l-1; i++) {
    obj = obj[parts[i]];
  }

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

  var schema = this._path(path) || this.schema.virtualpath(path)
    , pieces = path.split('.')
    , obj = this._doc;

  for (var i = 0, l = pieces.length; i < l; i++) {
    obj = null == obj ? null : obj[pieces[i]];
  }

  if (schema) {
    obj = schema.applyGetters(obj, this);
  }

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

Document.prototype.commit =
Document.prototype.markModified = function (path) {
  this._activePaths.modify(path);
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
  } catch (e) {
    this.error(e);
    res = false;
  }
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
  var directModifiedPaths = Object.keys(this._activePaths.states.modify);

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
  return (path in this._activePaths.states.modify);
};

/**
 * Checks if a certain path was initialized
 *
 * @param {String} path
 */

Document.prototype.isInit = function (path) {
  return (path in this._activePaths.states.init);
};

/**
 * Validation middleware
 *
 * @param {Function} next
 * @api public
 */

Document.prototype.validate = function (next) {
  var total = 0
    , self = this
    , validating = {}

  if (!this._activePaths.some('require', 'init', 'modify')) {
    return complete();
  }

  function complete () {
    next(self._validationError);
    self._validationError = null;
  }

  this._activePaths.forEach('require', 'init', 'modify', function validatePath (path) {
    if (validating[path]) return;

    validating[path] = true;
    total++;

    process.nextTick(function(){
      var p = self.schema.path(path);
      if (!p) return --total || complete();

      p.doValidate(self.getValue(path), function (err) {
        if (err) {
          self.invalidate(path, err);
        }
        --total || complete();
      }, self);
    });
  });

  return this;
};

/**
 * Marks a path as invalid, causing a subsequent validation to fail.
 *
 * @param {String} path of the field to invalidate
 * @param {String/Error} error of the path.
 * @api public
 */

Document.prototype.invalidate = function (path, err) {
  if (!this._validationError) {
    this._validationError = new ValidationError(this);
  }

  if (!err || 'string' === typeof err) {
    err = new ValidatorError(path, err);
  }

  this._validationError.errors[path] = err;
}

/**
 * Resets the atomics and modified states of this document.
 *
 * @private
 * @return {this}
 */

Document.prototype._reset = function reset () {
  var self = this;
  DocumentArray || (DocumentArray = require('./types/documentarray'));

  this._activePaths
  .map('init', 'modify', function (i) {
    return self.getValue(i);
  })
  .filter(function (val) {
    return (val && val instanceof DocumentArray && val.length);
  })
  .forEach(function (array) {
    array.forEach(function (doc) {
      doc._reset();
    });
  });

  // clear atomics
  this._dirty().forEach(function (dirt) {
    var type = dirt.value;
    if (type && type._path && type.doAtomics) {
      type._atomics = {};
    }
  });

  // Clear 'modify'('dirty') cache
  this._activePaths.clear('modify');
  var self = this;
  this.schema.requiredPaths.forEach(function (path) {
    self._activePaths.require(path);
  });

  return this;
}

/**
 * Returns the dirty paths / vals
 *
 * @api private
 */

Document.prototype._dirty = function _dirty () {
  var self = this;

  return this._activePaths.map('modify', function (path) {
    return { path: path
           , value: self.getValue(path)
           , schema: self._path(path) };
  });
}

/**
 * Returns if the document has been modified
 *
 * @return {Boolean}
 * @api public
 */

Document.prototype.__defineGetter__('modified', function () {
  return this._activePaths.some('modify');
});

/**
 * Compiles schemas.
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
        , (('Object' === limb.constructor.name
               && Object.keys(limb).length)
               && (!limb.type || limb.type.type)
               ? limb
               : null)
        , proto
        , prefix
        , keys);
  }
};

/**
 * Defines the accessor named prop on the incoming prototype.
 * @api private
 */

function define (prop, subprops, prototype, prefix, keys) {
  var prefix = prefix || ''
    , path = (prefix ? prefix + '.' : '') + prop;

  if (subprops) {

    Object.defineProperty(prototype, prop, {
        enumerable: true
      , get: function () {
          if (!this.__getters)
            this.__getters = {};

          if (!this.__getters[path]) {
            var nested = Object.create(this);

            // save scope for nested getters/setters
            if (!prefix) nested._scope = this;

            // shadow inherited getters from sub-objects so
            // thing.nested.nested.nested... doesn't occur (gh-366)
            var i = 0
              , len = keys.length;

            for (; i < len; ++i) {
              // over-write the parents getter without triggering it
              Object.defineProperty(nested, keys[i], {
                  enumerable: false   // It doesn't show up.
                , writable: true      // We can set it later.
                , configurable: true  // We can Object.defineProperty again.
                , value: undefined    // It shadows its parent.
              });
            }

            nested.toObject = function () {
              return this.get(path);
            };

            compile(subprops, nested, path);
            this.__getters[path] = nested;
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
      , get: function ( ) { return this.get.call(this._scope || this, path); }
      , set: function (v) { return this.set.call(this._scope || this, path, v); }
    });
  }
};

/**
 * We override the schema setter to compile accessors
 *
 * @api private
 */

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

Document.prototype._registerHooks = function () {
  if (!this.save) return;

  var self = this;
  DocumentArray || (DocumentArray = require('./types/documentarray'));

  this.pre('save', function (next) {
    // we keep the error semaphore to make sure we don't
    // call `save` unnecessarily (we only need 1 error)
    var subdocs = 0
      , error = false
      , self = this;

    var arrays = this._activePaths
    .map('init', 'modify', function (i) {
      return self.getValue(i);
    })
    .filter(function (val) {
      return (val && val instanceof DocumentArray && val.length);
    });

    if (!arrays.length)
      return next();

    arrays.forEach(function (array) {
      subdocs += array.length;
      array.forEach(function (value) {
        if (!error)
          value.save(function (err) {
            if (!error) {
              if (err) {
                error = true;
                next(err);
              } else
                --subdocs || next();
            }
          });
      });
    });
  }, function (err) {
    this.db.emit('error', err);
  }).pre('save', function checkForExistingErrors (next) {
    if (self._saveError){
      next(self._saveError);
      self._saveError = null;
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
  this._saveError = err;
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

Document.prototype.toObject = function (options) {
  options || (options = {});
  options.minimize = true;
  return clone(this._doc, options);
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
  return inspect(this.toObject());
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
    return String(this.errors[key]);
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
