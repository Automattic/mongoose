/*!
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
  , ValidationError = require('./errors/validation')
  , DocumentError = require('./errors/document')
  , deepEqual = utils.deepEqual
  , hooks = require('hooks')
  , DocumentArray

/**
 * Document constructor.
 *
 * @param {Object} obj the values to set
 * @param {Object} [fields] the fields which were selected in the query returning this document
 * @param {Boolean} [skipId] bool, should we auto create an ObjectId _id
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `init`: Emitted on a document after it has was retreived from the db and fully hydrated by Mongoose.
 * @event `save`: Emitted when the document is successfully saved
 * @api private
 */

function Document (obj, fields, skipId) {
  // node <0.4.3 bug
  if (!this._events) this._events = {};
  this.setMaxListeners(0);

  if ('boolean' === typeof fields) {
    this._strictMode = fields;
    this._selected = fields = undefined;
  } else {
    this._strictMode = this.schema.options && this.schema.options.strict;
    this._selected = fields;
  }

  this.isNew = true;
  this.errors = undefined;
  this._shardval = undefined;
  this._saveError = undefined;
  this._validationError = undefined;
  this._adhocPaths = undefined;
  this._removing = undefined;
  this._inserting = undefined;
  this.__version = undefined;
  this.__getters = {};
  this.__id = undefined;

  this._activePaths = new ActiveRoster;

  var required = this.schema.requiredPaths();
  for (var i = 0; i < required.length; ++i) {
    this._activePaths.require(required[i]);
  }

  this._doc = this._buildDoc(obj, fields, skipId);
  if (obj) this.set(obj, undefined, true);
  this._registerHooks();
};

/*!
 * Inherit from EventEmitter.
 */

Document.prototype.__proto__ = EventEmitter.prototype;

/**
 * The documents schema.
 *
 * @api public
 * @property schema
 */

Document.prototype.schema;

/**
 * Boolean flag specifying if the document is new.
 *
 * @api public
 * @property isNew
 */

Document.prototype.isNew;

/**
 * The string version of this documents _id.
 *
 * ####Note:
 *
 * This getter exists on all documents by default. The getter can be disabled by setting the `id` [option](/docs/guide.html#id) of its `Schema` to false at construction time.
 *
 *     new Schema({ name: String }, { id: false });
 *
 * @api public
 * @see Schema options /docs/guide.html#options
 * @property id
 */

Document.prototype.id;

/**
 * Hash containing current validation errors.
 *
 * @api public
 * @property errors
 */

Document.prototype.errors;

/**
 * Builds the default doc structure
 *
 * @param {Object} obj
 * @param {Object} [fields]
 * @param {Boolean} [skipId]
 * @return {Object}
 * @api private
 */

Document.prototype._buildDoc = function (obj, fields, skipId) {
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
    var p = paths[ii];

    if ('_id' == p) {
      if (skipId) continue;
      if (obj && '_id' in obj) continue;
    }

    var type = this.schema.paths[p]
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

            def = type.getDefault(self, true);
            if ('undefined' !== typeof def) {
              doc_[piece] = def;
              self._activePaths.default(p);
            }

          } else if (p in fields) {
            // selected field
            def = type.getDefault(self, true);
            if ('undefined' !== typeof def) {
              doc_[piece] = def;
              self._activePaths.default(p);
            }
          }
        } else {
          def = type.getDefault(self, true);
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
 * Initializes the document without setters or marking anything modified.
 *
 * Called internally after a document is returned from mongodb.
 *
 * @param {Object} doc document returned by mongo
 * @param {Function} fn callback
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

/*!
 * Init helper.
 *
 * @param {Object} self document instance
 * @param {Object} obj raw mongodb doc
 * @param {Object} doc object we are initializing
 * @api private
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
      if (!doc[i]) {
        doc[i] = {};
      }
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
 * Stores the current values of the shard keys.
 *
 * ####Note:
 *
 * _Shard key values do not / are not allowed to change._
 *
 * @api private
 */

Document.prototype._storeShard = function _storeShard () {
  // backwards compat
  var key = this.schema.options.shardKey || this.schema.options.shardkey;
  if (!(key && 'Object' == key.constructor.name)) return;

  var orig = this._shardval = {}
    , paths = Object.keys(key)
    , len = paths.length
    , val

  for (var i = 0; i < len; ++i) {
    val = this.getValue(paths[i]);
    if (isMongooseObject(val)) {
      orig[paths[i]] = val.toObject({ depopulate: true })
    } else if (null != val && val.valueOf) {
      orig[paths[i]] = val.valueOf();
    } else {
      orig[paths[i]] = val;
    }
  }
}

/*!
 * Set up middleware support
 */

for (var k in hooks) {
  Document.prototype[k] = Document[k] = hooks[k];
}

/**
 * Sends an update command with this document `_id` as the query selector.
 *
 * ####Example:
 *
 *     weirdCar.update({$inc: {wheels:1}}, { safe: true }, callback);
 *
 * ####Valid options:
 *
 *  - `safe` safe mode (defaults to value set in schema (true))
 *  - `upsert` (boolean) whether to create the doc if it doesn't match (false)
 *
 * @param {Object} doc
 * @param {Object} options
 * @param {Function} callback
 * @return {Query}
 * @api public
 */

Document.prototype.update = function update () {
  var args = utils.args(arguments);
  args.unshift({_id: this._id});
  this.constructor.update.apply(this.constructor, args);
}

/**
 * Sets the value of a path, or many paths.
 *
 * ####Example:
 *
 *     // path, value
 *     doc.set(path, value)
 *
 *     // object
 *     doc.set({
 *         path  : value
 *       , path2 : {
 *            path  : value
 *         }
 *     })
 *
 *     // only-the-fly cast to number
 *     doc.set(path, value, Number)
 *
 *     // only-the-fly cast to string
 *     doc.set(path, value, String)
 *
 * @param {String|Object} path path or object of key/vals to set
 * @param {Any} val the value to set
 * @param {Schema|String|Number|Buffer|etc..} [type] optionally specify a type for "on-the-fly" attributes
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
          } else if ('throw' == this._strictMode) {
            throw new Error("Field `" + key + "` is not in schema.");
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
    this.setValue(path, null);
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
    , pathToMark

  // When using the $set operator the path to the field must already exist.
  // Else mongodb throws: "LEFT_SUBFIELD only supports Object"

  if (parts.length <= 1) {
    pathToMark = path;
  } else {
    for (var i = 0; i < parts.length; ++i) {
      var part = parts[i];
      var subpath = parts.slice(0, i).concat(part).join('.');
      if (this.isDirectModified(subpath) // earlier prefixes that are already
                                         // marked as dirty have precedence
          || this.get(subpath) === null) {
        pathToMark = subpath;
        break;
      }
    }

    if (!pathToMark) pathToMark = path;
  }

  if (!schema || null === val || undefined === val) {
    this._set(pathToMark, path, constructing, parts, schema, val);
    return this;
  }

  var self = this;

  // if this doc is being constructed we should not
  // trigger getters.
  var priorVal = constructing
    ? undefined
    : this.get(path);

  var shouldSet = this.try(function(){
    val = schema.applySetters(val, self, false, priorVal);
  });

  if (shouldSet) {
    this._set(pathToMark, path, constructing, parts, schema, val, priorVal);
  }

  return this;
}

/**
 * Handles the actual setting of the value and marking the path modified if appropriate.
 *
 * @api private
 */

Document.prototype._set = function (pathToMark, path, constructing, parts, schema, val, priorVal) {
  if (this.isNew) {
    this.markModified(pathToMark);
  } else {

    priorVal || (priorVal = this.get(path));

    if (!this.isDirectModified(pathToMark)) {
      if (undefined === val && !this.isSelected(path)) {
        // special case:
        // when a path is not selected in a query its initial
        // value will be undefined.
        this.markModified(pathToMark, priorVal);
      } else if (undefined === val && path in this._activePaths.states.default) {
        // do nothing
        // unsetting the default value which was never saved
      } else if (!deepEqual(val, priorVal)) {
        this.markModified(pathToMark, priorVal);
      } else if (!constructing &&
                 null != val &&
                 path in this._activePaths.states.default &&
                 deepEqual(val, schema.getDefault(this, constructing))) {
        // special case:
        // a path with a default was $unset on the server
        // and the user is setting it to the same value again
        this.markModified(pathToMark, priorVal);
      }
    }
  }

  var obj = this._doc
    , i = 0
    , l = parts.length

  for (; i < l; i++) {
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

  for (var i = 0, l = parts.length; i < l; i++) {
    part = parts[i];
    obj = obj.getValue
        ? obj.getValue(part) // If we have an embedded array document member
        : obj[part];
    if (!obj) return obj;
  }

  return obj;
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

  for (var i = 0, len = parts.length-1; i < len; i++) {
    obj = obj[parts[i]];
  }

  obj[parts[len]] = val;
  return this;
};

/**
 * Returns the value of a path.
 *
 * ####Example
 *
 *     // path
 *     doc.get('age') // 47
 *
 *     // dynamic casting to a string
 *     doc.get('age', String) // "47"
 *
 * @param {String} path
 * @param {Schema|String|Number|Buffer|etc..} [type] optionally specify a type for on-the-fly attributes
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
 * Returns the schematype for the given `path`.
 *
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
 * Marks the path as having pending changes to write to the db.
 *
 * _Very helpful when using [Mixed](./schematypes.html#mixed) types._
 *
 * ####Example:
 *
 *     doc.mixed.type = 'changed';
 *     doc.markModified('mixed.type');
 *     doc.save() // changes to mixed.type are now persisted
 *
 * @param {String} path the path to mark modified
 * @api public
 */

Document.prototype.markModified = function (path) {
  this._activePaths.modify(path);
};

/**
 * Catches errors that occur during execution of `fn` and stores them to later be passed when `save()` is executed.
 *
 * @param {Function} fn function to execute
 * @param {Object} scope the scope with which to call fn
 * @api private
 */

Document.prototype.try = function (fn, scope) {
  var res;
  try {
    fn.call(scope);
    res = true;
  } catch (e) {
    this._error(e);
    res = false;
  }
  return res;
};

/**
 * Returns the list of paths that have been modified.
 *
 * @return {Array}
 * @api public
 */

Document.prototype.modifiedPaths = function () {
  var directModifiedPaths = Object.keys(this._activePaths.states.modify);

  return directModifiedPaths.reduce(function (list, path) {
    var parts = path.split('.');
    return list.concat(parts.reduce(function (chains, part, i) {
      return chains.concat(parts.slice(0, i).concat(part).join('.'));
    }, []));
  }, []);
};

/**
 * Returns true if this document was modified, else false.
 *
 * If `path` is given, checks if a path or any full path containing `path` as part of its path chain has been modified.
 *
 * ####Example
 *
 *     doc.set('documents.0.title', 'changed');
 *     doc.isModified()                    // true
 *     doc.isModified('documents')         // true
 *     doc.isModified('documents.0.title') // true
 *     doc.isDirectModified('documents')   // false
 *
 * @param {String} [path] optional
 * @return {Boolean}
 * @api public
 */

Document.prototype.isModified = function (path) {
  return path
    ? !!~this.modifiedPaths().indexOf(path)
    : this._activePaths.some('modify');
};

/**
 * Returns true if `path` was directly set and modified, else false.
 *
 * ####Example
 *
 *     doc.set('documents.0.title', 'changed');
 *     doc.isDirectModified('documents.0.title') // true
 *     doc.isDirectModified('documents') // false
 *
 * @param {String} path
 * @return {Boolean}
 * @api public
 */

Document.prototype.isDirectModified = function (path) {
  return (path in this._activePaths.states.modify);
};

/**
 * Checks if `path` was initialized.
 *
 * @param {String} path
 * @return {Boolean}
 * @api public
 */

Document.prototype.isInit = function (path) {
  return (path in this._activePaths.states.init);
};

/**
 * Checks if `path` was selected in the source query which initialized this document.
 *
 * ####Example
 *
 *     Thing.findOne().select('name').exec(function (err, doc) {
 *        doc.isSelected('name') // true
 *        doc.isSelected('age')  // false
 *     })
 *
 * @param {String} path
 * @return {Boolean}
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
    var pathDot = path + '.';

    while (i--) {
      cur = paths[i];
      if ('_id' == cur) continue;

      if (0 === cur.indexOf(pathDot)) {
        return inclusive;
      }

      if (0 === pathDot.indexOf(cur)) {
        return inclusive;
      }
    }

    return ! inclusive;
  }

  return true;
}

/**
 * Executes registered validation rules for this document.
 *
 * ####Note:
 *
 * This method is called `pre` save and if a validation rule is violated, [save](#model_Model-save) is aborted and the error is returned to your `callback`.
 *
 * ####Example:
 *
 *     doc.validate(function (err) {
 *       if (err) handleError(err);
 *       else // validation passed
 *     });
 *
 * @param {Function} cb called after validation completes, passing an error if one occurred
 * @api public
 */

Document.prototype.validate = function (cb) {
  var self = this

  // only validate required fields when necessary
  var paths = Object.keys(this._activePaths.states.require).filter(function (path) {
    if (!self.isSelected(path) && !self.isModified(path)) return false;
    return true;
  });

  paths = paths.concat(Object.keys(this._activePaths.states.init));
  paths = paths.concat(Object.keys(this._activePaths.states.modify));

  if (0 === paths.length) {
    complete();
    return this;
  }

  var validating = {}
    , total = 0;

  paths.forEach(validatePath);
  return this;

  function validatePath (path) {
    if (validating[path]) return;

    validating[path] = true;
    total++;

    process.nextTick(function(){
      var p = self.schema.path(path);
      if (!p) return --total || complete();

      p.doValidate(self.getValue(path), function (err) {
        if (err) self.invalidate(path, err, true);
        --total || complete();
      }, self);
    });
  }

  function complete () {
    var err = self._validationError;
    self._validationError = undefined;
    cb(err);
  }
};

/**
 * Marks a path as invalid, causing validation to fail.
 *
 * @param {String} path the field to invalidate
 * @param {String|Error} err the error which states the reason `path` was invalid
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
 * Resets the internal modified state of this document.
 *
 * @api private
 * @return {Document}
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
    if (type && type._atomics) {
      type._atomics = {};
    }
  });

  // Clear 'modify'('dirty') cache
  this._activePaths.clear('modify');
  this._validationError = undefined;
  this.errors = undefined;
  var self = this;
  this.schema.requiredPaths().forEach(function (path) {
    self._activePaths.require(path);
  });

  return this;
}

/**
 * Returns this documents dirty paths / vals.
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
      if (!(item.value && top.value)) return;

      // special case for top level MongooseArrays
      if (top.value._atomics && top.value.hasAtomics()) {
        // the `top` array itself and a sub path of `top` are being modified.
        // the only way to honor all of both modifications is through a $set
        // of entire array.
        top.value._atomics = {};
        top.value._atomics.$set = top.value;
      }
    }
  });

  top = lastPath = null;
  return minimal;
}

/*!
 * Compiles schemas.
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

/*!
 * Defines the accessor named prop on the incoming prototype.
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
          return this.set(path, v);
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
 * Assigns/compiles `schema` into this documents prototype.
 *
 * @param {Schema} schema
 * @api private
 */

Document.prototype._setSchema = function (schema) {
  compile(schema.tree, this);
  this.schema = schema;
}

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

    // check for DocumentArrays
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
        if (error) return;

        value.save(function (err) {
          if (error) return;

          if (err) {
            error = true;
            self._validationError = undefined;
            return next(err);
          }

          --subdocs || next();
        });
      });
    });
  }, function (err) {
    // emit on the Model if listening
    if (this.constructor.listeners('error').length) {
      this.constructor.emit('error', err);
    } else {
      // emit on the connection
      if (!this.db.listeners('error').length) {
        err.stack = 'No listeners detected, throwing. '
                  + 'Consider adding an error listener to your connection.\n'
                  + err.stack
      }
      this.db.emit('error', err);
    }
  }).pre('save', function checkForExistingErrors (next) {
    // if any doc.set() calls failed
    if (this._saveError) {
      next(this._saveError);
      this._saveError = null;
    } else {
      next();
    }
  }).pre('save', function validation (next) {
    return this.validate(next);
  });

  // add user defined queues
  this._doQueue();
};

/**
 * Registers an error
 *
 * @param {Error} err
 * @api private
 */

Document.prototype._error = function (err) {
  this._saveError = err;
  return this;
};

/**
 * Executes methods queued from the Schema definition
 *
 * @api private
 */

Document.prototype._doQueue = function () {
  var q = this.schema && this.schema.callQueue;
  if (q) {
    for (var i = 0, l = q.length; i < l; i++) {
      this[q[i][0]].apply(this, q[i][1]);
    }
  }
  return this;
};

/**
 * Converts this document into a plain javascript object
 *
 * ####Options:
 *
 * - `getters` apply all getters (path and virtual getters)
 * - `virtuals` apply virtual getters (can override `getters` option)
 * - `minimize` remove empty objects (defaults to true)
 *
 * Example of only applying path getters
 *
 *     doc.toObject({ getters: true, virtuals: false })
 *
 * Example of only applying virtual getters
 *
 *     doc.toObject({ virtuals: true })
 *
 * Example of applying both path and virtual getters
 *
 *     doc.toObject({ getters: true })
 *
 * @param {Object} [options]
 * @return {Object} js object
 * @api public
 */

Document.prototype.toObject = function (options) {
  // When internally saving this document we always pass options,
  // bypassing the custom schema options.
  if (!(options && 'Object' == options.constructor.name)) {
    options = this.schema.options.toObject
      ? clone(this.schema.options.toObject)
      : {};
  }

  ;('minimize' in options) || (options.minimize = this.schema.options.minimize);

  var ret = clone(this._doc, options);

  if (options.virtuals || options.getters && false !== options.virtuals) {
    applyGetters(this, ret, 'virtuals', options);
  }

  if (options.getters) {
    applyGetters(this, ret, 'paths', options);
  }

  return ret;
};

/*!
 * Applies virtuals properties to `json`.
 *
 * @param {Document} self
 * @param {Object} json
 * @param {String} type either `virtuals` or `paths`
 * @return {Object} `json`
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
 * The return value of this method is used in calls to JSON.stringify(doc).
 *
 * @param {Object} options same options as Document#toObject
 * @return {Object}
 * @see Document#toObject
 * @api public
 */

Document.prototype.toJSON = function (options) {
  // check for object type since an array of documents
  // being stringified passes array indexes instead
  // of options objects. JSON.stringify([doc, doc])
  if (!(options && 'Object' == options.constructor.name)) {
    options = this.schema.options.toJSON
      ? clone(this.schema.options.toJSON)
      : {};
  }
  options.json = true;
  return this.toObject(options);
};

/**
 * Helper for console.log
 *
 * @api public
 */

Document.prototype.inspect = function (options) {
  var opts = options && 'Object' == options.constructor.name
    ? options
    : undefined
  return inspect(this.toObject(opts));
};

/**
 * Helper for console.log
 *
 * @api public
 * @method toString
 */

Document.prototype.toString = Document.prototype.inspect;

/**
 * Returns true if the Document stores the same data as doc.
 *
 * Documents are considered equal when they have matching `_id`s.
 *
 * @param {Document} doc a document to compare
 * @return {Boolean}
 * @api public
 */

Document.prototype.equals = function (doc) {
  var tid = this.get('_id');
  var docid = doc.get('_id');
  return tid.equals
    ? tid.equals(docid)
    : tid === docid;
};

/*!
 * Module exports.
 */

Document.ValidationError = ValidationError;
module.exports = exports = Document;
exports.Error = DocumentError;
