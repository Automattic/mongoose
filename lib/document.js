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
  , isMongooseObject = utils.isMongooseObject
  , inspect = require('util').inspect
  , StateMachine = require('./statemachine')
  , ActiveRoster = StateMachine.ctor('require', 'modify', 'init', 'default')
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

  this._strictMode = this.schema.options && this.schema.options.strict;

  if ('boolean' === typeof fields) {
    this._strictMode = fields;
    fields = undefined;
  } else {
    this._selected = fields;
  }

  this._activePaths = new ActiveRoster();
  this._doc = this.buildDoc(fields);
  var self = this;
  this.schema.requiredPaths.forEach(function (path) {
    self._activePaths.require(path);
  });

  this._saveError = null;
  this._validationError = null;
  this.isNew = true;

  if (obj) this.set(obj, undefined, true);

  this._registerHooks();
  this.doQueue();

  this.errors = undefined;
  this._shardval = undefined;
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

  var paths = Object.keys(this.schema.paths)
    , plen = paths.length
    , ii = 0

  for (; ii < plen; ++ii) {
    var p = paths[ii]
      , type = this.schema.paths[p]
      , path = p.split('.')
      , len = path.length
      , last = len-1
      , doc_ = doc
      , i = 0

    for (; i < len; ++i) {
      var piece = path[i]
        , def

      if (i === last) {
        if (fields) {
          if (exclude) {
            // apply defaults to all non-excluded fields
            if (p in fields) continue;

            def = type.getDefault(self);
            if ('undefined' !== typeof def) {
              doc_[piece] = def;
              self._activePaths.default(p);
            }

          } else if (p in fields) {
            // selected field
            def = type.getDefault(self);
            if ('undefined' !== typeof def) {
              doc_[piece] = def;
              self._activePaths.default(p);
            }
          }
        } else {
          def = type.getDefault(self);
          if ('undefined' !== typeof def) {
            doc_[piece] = def;
            self._activePaths.default(p);
          }
        }
      } else {
        doc_ = doc_[piece] || (doc_[piece] = {});
      }
    }
  };

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
  this._storeShard();

  this.emit('init');
  if (fn) fn(null);
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

/**
 * _storeShard
 *
 * Stores the current values of the shard keys
 * for use later in the doc.save() where clause.
 *
 * Shard key values do not / are not allowed to change.
 *
 * @param {Object} document
 * @private
 */

Document.prototype._storeShard = function _storeShard () {
  var key = this.schema.options.shardkey;
  if (!(key && 'Object' == key.constructor.name)) return;

  var orig = this._shardval = {}
    , paths = Object.keys(key)
    , len = paths.length
    , val

  for (var i = 0; i < len; ++i) {
    val = this.getValue(paths[i]);
    if (isMongooseObject(val)) {
      orig[paths[i]] = val.toObject({ depopulate: true })
    } else if (val.valueOf) {
      orig[paths[i]] = val.valueOf();
    } else {
      orig[paths[i]] = val;
    }
  }
}

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
  var constructing = true === type
    , adhoc = type && true !== type
    , adhocs

  if (adhoc) {
    adhocs = this._adhocPaths || (this._adhocPaths = {});
    adhocs[path] = Schema.interpretAsType(path, type);
  }

  if ('string' !== typeof path) {
    // new Document({ key: val })

    if (null === path || undefined === path) {
      var _ = path;
      path = val;
      val = _;

    } else {
      var prefix = val
        ? val + '.'
        : '';

      if (path instanceof Document) path = path._doc;

      var keys = Object.keys(path)
        , i = keys.length
        , pathtype
        , key

      while (i--) {
        key = keys[i];
        if (null != path[key] && 'Object' === path[key].constructor.name
          && !(this._path(prefix + key) instanceof MixedSchema)) {
          this.set(path[key], prefix + key, constructing);
        } else if (this._strictMode) {
          pathtype = this.schema.pathType(prefix + key);
          if ('real' === pathtype || 'virtual' === pathtype) {
            this.set(prefix + key, path[key], constructing);
          }
        } else if (undefined !== path[key]) {
          this.set(prefix + key, path[key], constructing);
        }
      }

      return this;
    }
  }

  // ensure _strict is honored for obj props
  // docschema = new Schema({ path: { nest: 'string' }})
  // doc.set('path', obj);
  var pathType = this.schema.pathType(path);
  if ('nested' == pathType && val && 'Object' == val.constructor.name) {
    this.set(val, path, constructing);
    return this;
  }

  var schema;
  if ('adhocOrUndefined' == pathType && this._strictMode) {
    return this;
  } else if ('virtual' == pathType) {
    schema = this.schema.virtualpath(path);
    schema.applySetters(val, this);
    return this;
  } else {
    schema = this._path(path);
  }

  var parts = path.split('.')
    , obj = this._doc
    , self = this
    , pathToMark
    , subpaths
    , subpath

  // When using the $set operator the path to the field must already exist.
  // Else mongodb throws: "LEFT_SUBFIELD only supports Object"

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
      // if this doc is being constructed we should not
      // trigger getters.
      var cur = constructing ? undefined : self.get(path);
      var casted = schema.cast(val, self, false, cur);
      val = schema.applySetters(casted, self);
    })) {

    if (this.isNew) {
      this.markModified(pathToMark);
    } else {
      var priorVal = this.get(path);

      if (!this.isDirectModified(pathToMark)) {
        if (undefined === val && !this.isSelected(path)) {
          // special case:
          // when a path is not selected in a query its initial
          // value will be undefined.
          this.markModified(pathToMark);
        } else if (!deepEqual(val, priorVal)) {
          this.markModified(pathToMark);
        } else if (!constructing &&
                   null != val &&
                   path in this._activePaths.states.default &&
                   deepEqual(val, schema.getDefault(this))) {
          // special case:
          // a path with a default was $unset on the server
          // and the user is setting it to the same value again
          this.markModified(pathToMark);
        }
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
 * @todo - deprecate? not used anywhere
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
 * @api private
 */

Document.prototype._path = function (path) {
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
 * modifiedPaths
 *
 * Returns the list of paths that have been modified.
 *
 * If we set `documents.0.title` to 'newTitle'
 * then `documents`, `documents.0`, and `documents.0.title`
 * are modified.
 *
 * @api public
 * @returns Boolean
 */

Document.prototype.__defineGetter__('modifiedPaths', function () {
  var directModifiedPaths = Object.keys(this._activePaths.states.modify);

  return directModifiedPaths.reduce(function (list, path) {
    var parts = path.split('.');
    return list.concat(parts.reduce(function (chains, part, i) {
      return chains.concat(parts.slice(0, i).concat(part).join('.'));
    }, []));
  }, []);
});

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
 * @returns Boolean
 * @api public
 */

Document.prototype.isModified = function (path) {
  return !!~this.modifiedPaths.indexOf(path);
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
 * @returns Boolean
 * @api public
 */

Document.prototype.isDirectModified = function (path) {
  return (path in this._activePaths.states.modify);
};

/**
 * Checks if a certain path was initialized
 *
 * @param {String} path
 * @returns Boolean
 * @api public
 */

Document.prototype.isInit = function (path) {
  return (path in this._activePaths.states.init);
};

/**
 * Checks if a path was selected.
 * @param {String} path
 * @return Boolean
 * @api public
 */

Document.prototype.isSelected = function isSelected (path) {
  if (this._selected) {

    if ('_id' === path) {
      return 0 !== this._selected._id;
    }

    var paths = Object.keys(this._selected)
      , i = paths.length
      , inclusive = false
      , cur

    if (1 === i && '_id' === paths[0]) {
      // only _id was selected.
      return 0 === this._selected._id;
    }

    while (i--) {
      cur = paths[i];
      if ('_id' == cur) continue;
      inclusive = !! this._selected[cur];
      break;
    }

    if (path in this._selected) {
      return inclusive;
    }

    i = paths.length;

    while (i--) {
      cur = paths[i];
      if ('_id' == cur) continue;

      if (0 === cur.indexOf(path + '.')) {
        return inclusive;
      }

      if (0 === (path + '.').indexOf(cur)) {
        return inclusive;
      }
    }

    return ! inclusive;
  }

  return true;
}

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
        if (err) self.invalidate(path, err);
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

  var all = this._activePaths.map('modify', function (path) {
    return { path: path
           , value: self.getValue(path)
           , schema: self._path(path) };
  });

  // Sort dirty paths in a flat hierarchy.
  all.sort(function (a, b) {
    return (a.path < b.path ? -1 : (a.path > b.path ? 1 : 0));
  });

  // Ignore "foo.a" if "foo" is dirty already.
  var minimal = []
    , lastPath
    , top;

  all.forEach(function (item, i) {
    if (item.path.indexOf(lastPath) !== 0) {
      lastPath = item.path + '.';
      minimal.push(item);
      top = item;
    } else {
      // special case for top level MongooseArrays
      if (top.value._path && top.value.doAtomics) {
        // and the item is not a MongooseArray
        if (!(item.value._path && item.value.doAtomics)) {
          // theres a sub path of top being explicitly set.
          // the only way to honor all of their modifications
          // is through a $set of entire array.
          // change top to a $set op
          top.value._atomics = {};
          top.value._atomics.$set = top.value;
        }
      }
    }
  });

  top = lastPath = null;
  return minimal;
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

Document.prototype._registerHooks = function _registerHooks () {
  if (!this.save) return;

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
    if (this._saveError) {
      next(this._saveError);
      this._saveError = null;
    } else {
      next();
    }
  }).pre('save', function validation (next) {
    return this.validate(next);
  });
};

/**
 * Registers an error
 *
 * @TODO underscore this method
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
 * @TODO underscore this method
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
 * Available options:
 *
 * - getters: apply all getters (path and virtual getters)
 * - virtuals: apply virtual getters (can override `getters` option)
 *
 * Example of only applying path getters:
 *
 *     doc.toObject({ getters: true, virtuals: false })
 *
 * Example of only applying virtual getters:
 *
 *     doc.toObject({ virtuals: true })
 *
 * Example of applying both path and virtual getters:
 *
 *     doc.toObject({ getters: true })
 *
 * @return {Object} plain object
 * @api public
 */

Document.prototype.toObject = function (options) {
  options || (options = {});
  options.minimize = true;

  var ret = clone(this._doc, options);

  if (options.virtuals || options.getters && false !== options.virtuals) {
    applyGetters(this, ret, 'virtuals', options);
  }

  if (options.getters) {
    applyGetters(this, ret, 'paths', options);
  }

  return ret;
};

/**
 * Applies virtuals properties to `json`.
 *
 * @param {Document} self
 * @param {Object} json
 * @param {String} either `virtuals` or `paths`
 * @return json
 * @private
 */

function applyGetters (self, json, type, options) {
  var schema = self.schema
    , paths = Object.keys(schema[type])
    , i = paths.length
    , path

  while (i--) {
    path = paths[i];

    var parts = path.split('.')
      , plen = parts.length
      , last = plen - 1
      , branch = json
      , part

    for (var ii = 0; ii < plen; ++ii) {
      part = parts[ii];
      if (ii === last) {
        branch[part] = clone(self.get(path), options);
      } else {
        branch = branch[part] || (branch[part] = {});
      }
    }
  }

  return json;
}

/**
 * JSON.stringify helper.
 *
 * Implicitly called when a document is passed
 * to JSON.stringify()
 *
 * @return {Object}
 * @api public
 */

Document.prototype.toJSON = function (options) {
  if ('undefined' === typeof options) options = {};
  options.json = true;
  return this.toObject(options);
};

/**
 * Helper for console.log
 *
 * @api public
 */

Document.prototype.toString =
Document.prototype.inspect = function (options) {
  return inspect(this.toObject(options));
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
