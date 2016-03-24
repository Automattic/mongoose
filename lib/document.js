/*!
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter,
    MongooseError = require('./error'),
    MixedSchema = require('./schema/mixed'),
    Schema = require('./schema'),
    ObjectExpectedError = require('./error/objectExpected'),
    StrictModeError = require('./error/strict'),
    ValidatorError = require('./schematype').ValidatorError,
    utils = require('./utils'),
    clone = utils.clone,
    isMongooseObject = utils.isMongooseObject,
    inspect = require('util').inspect,
    ValidationError = MongooseError.ValidationError,
    InternalCache = require('./internal'),
    deepEqual = utils.deepEqual,
    hooks = require('hooks-fixed'),
    PromiseProvider = require('./promise_provider'),
    DocumentArray,
    MongooseArray,
    Embedded;

/**
 * Document constructor.
 *
 * @param {Object} obj the values to set
 * @param {Object} [fields] optional object containing the fields which were selected in the query returning this document and any populated paths data
 * @param {Boolean} [skipId] bool, should we auto create an ObjectId _id
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `init`: Emitted on a document after it has was retreived from the db and fully hydrated by Mongoose.
 * @event `save`: Emitted when the document is successfully saved
 * @api private
 */

function Document(obj, fields, skipId) {
  this.$__ = new InternalCache;
  this.$__.emitter = new EventEmitter();
  this.isNew = true;
  this.errors = undefined;

  var schema = this.schema;

  if (typeof fields === 'boolean') {
    this.$__.strictMode = fields;
    fields = undefined;
  } else {
    this.$__.strictMode = schema.options && schema.options.strict;
    this.$__.selected = fields;
  }

  var required = schema.requiredPaths(true);
  for (var i = 0; i < required.length; ++i) {
    this.$__.activePaths.require(required[i]);
  }

  this.$__.emitter.setMaxListeners(0);
  this._doc = this.$__buildDoc(obj, fields, skipId);

  if (obj) {
    if (obj instanceof Document) {
      this.isNew = obj.isNew;
    }
    this.set(obj, undefined, true);
  }

  if (!schema.options.strict && obj) {
    var _this = this,
        keys = Object.keys(this._doc);

    keys.forEach(function(key) {
      if (!(key in schema.tree)) {
        defineKey(key, null, _this);
      }
    });
  }

  this.$__registerHooksFromSchema();
}

/*!
 * Document exposes the NodeJS event emitter API, so you can use
 * `on`, `once`, etc.
 */
utils.each(
    ['on', 'once', 'emit', 'listeners', 'removeListener', 'setMaxListeners',
      'removeAllListeners', 'addListener'],
    function(emitterFn) {
      Document.prototype[emitterFn] = function() {
        return this.$__.emitter[emitterFn].apply(this.$__.emitter, arguments);
      };
    });

Document.prototype.constructor = Document;

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
 * @method $__buildDoc
 * @memberOf Document
 */

Document.prototype.$__buildDoc = function(obj, fields, skipId) {
  var doc = {};
  var exclude = null;
  var keys;
  var ki;
  var _this = this;

  // determine if this doc is a result of a query with
  // excluded fields

  if (fields && utils.getFunctionName(fields.constructor) === 'Object') {
    keys = Object.keys(fields);
    ki = keys.length;

    if (ki === 1 && keys[0] === '_id') {
      exclude = !!fields[keys[ki]];
    } else {
      while (ki--) {
        if (keys[ki] !== '_id' &&
            (!fields[keys[ki]] || typeof fields[keys[ki]] !== 'object')) {
          exclude = !fields[keys[ki]];
          break;
        }
      }
    }
  }

  var paths = Object.keys(this.schema.paths),
      plen = paths.length,
      ii = 0;

  for (; ii < plen; ++ii) {
    var p = paths[ii];

    if (p === '_id') {
      if (skipId) {
        continue;
      }
      if (obj && '_id' in obj) {
        continue;
      }
    }

    var type = this.schema.paths[p];
    var path = p.split('.');
    var len = path.length;
    var last = len - 1;
    var curPath = '';
    var doc_ = doc;
    var i = 0;
    var included = false;

    for (; i < len; ++i) {
      var piece = path[i],
          def;

      curPath += piece;

      // support excluding intermediary levels
      if (exclude === true) {
        if (curPath in fields) {
          break;
        }
      } else if (fields && curPath in fields) {
        included = true;
      }

      if (i === last) {
        if (fields && exclude !== null) {
          if (exclude === true) {
            // apply defaults to all non-excluded fields
            if (p in fields) {
              continue;
            }

            def = type.getDefault(_this, true);
            if (typeof def !== 'undefined') {
              doc_[piece] = def;
              _this.$__.activePaths.default(p);
            }
          } else if (included) {
            // selected field
            def = type.getDefault(_this, true);
            if (typeof def !== 'undefined') {
              doc_[piece] = def;
              _this.$__.activePaths.default(p);
            }
          }
        } else {
          def = type.getDefault(_this, true);
          if (typeof def !== 'undefined') {
            doc_[piece] = def;
            _this.$__.activePaths.default(p);
          }
        }
      } else {
        doc_ = doc_[piece] || (doc_[piece] = {});
        curPath += '.';
      }
    }
  }

  return doc;
};

/**
 * Initializes the document without setters or marking anything modified.
 *
 * Called internally after a document is returned from mongodb.
 *
 * @param {Object} doc document returned by mongo
 * @param {Function} fn callback
 * @api public
 */

Document.prototype.init = function(doc, opts, fn) {
  // do not prefix this method with $__ since its
  // used by public hooks

  if (typeof opts === 'function') {
    fn = opts;
    opts = null;
  }

  this.isNew = false;

  // handle docs with populated paths
  // If doc._id is not null or undefined
  if (doc._id !== null && doc._id !== undefined &&
    opts && opts.populated && opts.populated.length) {
    var id = String(doc._id);
    for (var i = 0; i < opts.populated.length; ++i) {
      var item = opts.populated[i];
      this.populated(item.path, item._docs[id], item);
    }
  }

  init(this, doc, this._doc);
  this.$__storeShard();

  this.emit('init', this);
  if (fn) {
    fn(null);
  }
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

function init(self, obj, doc, prefix) {
  prefix = prefix || '';

  var keys = Object.keys(obj),
      len = keys.length,
      schema,
      path,
      i;

  while (len--) {
    i = keys[len];
    path = prefix + i;
    schema = self.schema.path(path);

    if (!schema && utils.isObject(obj[i]) &&
        (!obj[i].constructor || utils.getFunctionName(obj[i].constructor) === 'Object')) {
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
          try {
            doc[i] = schema.cast(obj[i], self, true);
          } catch (e) {
            self.invalidate(e.path, new ValidatorError({
              path: e.path,
              message: e.message,
              type: 'cast',
              value: e.value
            }));
          }
        } else {
          doc[i] = obj[i];
        }
      }
      // mark as hydrated
      if (!self.isModified(path)) {
        self.$__.activePaths.init(path);
      }
    }
  }
}

/**
 * Stores the current values of the shard keys.
 *
 * ####Note:
 *
 * _Shard key values do not / are not allowed to change._
 *
 * @api private
 * @method $__storeShard
 * @memberOf Document
 */

Document.prototype.$__storeShard = function() {
  // backwards compat
  var key = this.schema.options.shardKey || this.schema.options.shardkey;
  if (!(key && utils.getFunctionName(key.constructor) === 'Object')) {
    return;
  }

  var orig = this.$__.shardval = {},
      paths = Object.keys(key),
      len = paths.length,
      val;

  for (var i = 0; i < len; ++i) {
    val = this.getValue(paths[i]);
    if (isMongooseObject(val)) {
      orig[paths[i]] = val.toObject({depopulate: true});
    } else if (val !== null && val !== undefined && val.valueOf &&
          // Explicitly don't take value of dates
        (!val.constructor || utils.getFunctionName(val.constructor) !== 'Date')) {
      orig[paths[i]] = val.valueOf();
    } else {
      orig[paths[i]] = val;
    }
  }
};

/*!
 * Set up middleware support
 */

for (var k in hooks) {
  if (k === 'pre' || k === 'post') {
    Document.prototype['$' + k] = Document['$' + k] = hooks[k];
  } else {
    Document.prototype[k] = Document[k] = hooks[k];
  }
}

/**
 * Sends an update command with this document `_id` as the query selector.
 *
 * ####Example:
 *
 *     weirdCar.update({$inc: {wheels:1}}, { w: 1 }, callback);
 *
 * ####Valid options:
 *
 *  - same as in [Model.update](#model_Model.update)
 *
 * @see Model.update #model_Model.update
 * @param {Object} doc
 * @param {Object} options
 * @param {Function} callback
 * @return {Query}
 * @api public
 */

Document.prototype.update = function update() {
  var args = utils.args(arguments);
  args.unshift({_id: this._id});
  return this.constructor.update.apply(this.constructor, args);
};

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
 *     // on-the-fly cast to number
 *     doc.set(path, value, Number)
 *
 *     // on-the-fly cast to string
 *     doc.set(path, value, String)
 *
 *     // changing strict mode behavior
 *     doc.set(path, value, { strict: false });
 *
 * @param {String|Object} path path or object of key/vals to set
 * @param {Any} val the value to set
 * @param {Schema|String|Number|Buffer|*} [type] optionally specify a type for "on-the-fly" attributes
 * @param {Object} [options] optionally specify options that modify the behavior of the set
 * @api public
 */

Document.prototype.set = function(path, val, type, options) {
  if (type && utils.getFunctionName(type.constructor) === 'Object') {
    options = type;
    type = undefined;
  }

  var merge = options && options.merge,
      adhoc = type && type !== true,
      constructing = type === true,
      adhocs;

  var strict = options && 'strict' in options
      ? options.strict
      : this.$__.strictMode;

  if (adhoc) {
    adhocs = this.$__.adhocPaths || (this.$__.adhocPaths = {});
    adhocs[path] = Schema.interpretAsType(path, type, this.schema.options);
  }

  if (typeof path !== 'string') {
    // new Document({ key: val })

    if (path === null || path === void 0) {
      var _ = path;
      path = val;
      val = _;
    } else {
      var prefix = val
          ? val + '.'
          : '';

      if (path instanceof Document) {
        if (path.$__isNested) {
          path = path.toObject();
        } else {
          path = path._doc;
        }
      }

      var keys = Object.keys(path),
          i = keys.length,
          pathtype,
          key;

      while (i--) {
        key = keys[i];
        var pathName = prefix + key;
        pathtype = this.schema.pathType(pathName);

        if (path[key] !== null
            && path[key] !== void 0
              // need to know if plain object - no Buffer, ObjectId, ref, etc
            && utils.isObject(path[key])
            && (!path[key].constructor || utils.getFunctionName(path[key].constructor) === 'Object')
            && pathtype !== 'virtual'
            && pathtype !== 'real'
            && !(this.$__path(pathName) instanceof MixedSchema)
            && !(this.schema.paths[pathName] &&
            this.schema.paths[pathName].options &&
            this.schema.paths[pathName].options.ref)) {
          this.set(path[key], prefix + key, constructing);
        } else if (strict) {
          // Don't overwrite defaults with undefined keys (gh-3981)
          if (constructing && path[key] === void 0 &&
              this.get(key) !== void 0) {
            continue;
          }

          if (pathtype === 'real' || pathtype === 'virtual') {
            // Check for setting single embedded schema to document (gh-3535)
            if (this.schema.paths[pathName] &&
                this.schema.paths[pathName].$isSingleNested &&
                path[key] instanceof Document) {
              path[key] = path[key].toObject({virtuals: false});
            }
            this.set(prefix + key, path[key], constructing);
          } else if (pathtype === 'nested' && path[key] instanceof Document) {
            this.set(prefix + key,
                path[key].toObject({virtuals: false}), constructing);
          } else if (strict === 'throw') {
            if (pathtype === 'nested') {
              throw new ObjectExpectedError(key, path[key]);
            } else {
              throw new StrictModeError(key);
            }
          }
        } else if (path[key] !== void 0) {
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
  if (pathType === 'nested' && val) {
    if (utils.isObject(val) &&
        (!val.constructor || utils.getFunctionName(val.constructor) === 'Object')) {
      if (!merge) {
        this.setValue(path, null);
      }
      this.set(val, path, constructing);
      return this;
    }
    this.invalidate(path, new MongooseError.CastError('Object', val, path));
    return this;
  }

  var schema;
  var parts = path.split('.');

  if (pathType === 'adhocOrUndefined' && strict) {
    // check for roots that are Mixed types
    var mixed;

    for (i = 0; i < parts.length; ++i) {
      var subpath = parts.slice(0, i + 1).join('.');
      schema = this.schema.path(subpath);
      if (schema instanceof MixedSchema) {
        // allow changes to sub paths of mixed types
        mixed = true;
        break;
      }
    }

    if (!mixed) {
      if (strict === 'throw') {
        throw new StrictModeError(path);
      }
      return this;
    }
  } else if (pathType === 'virtual') {
    schema = this.schema.virtualpath(path);
    schema.applySetters(val, this);
    return this;
  } else {
    schema = this.$__path(path);
  }

  var pathToMark;

  // When using the $set operator the path to the field must already exist.
  // Else mongodb throws: "LEFT_SUBFIELD only supports Object"

  if (parts.length <= 1) {
    pathToMark = path;
  } else {
    for (i = 0; i < parts.length; ++i) {
      subpath = parts.slice(0, i + 1).join('.');
      if (this.isDirectModified(subpath) // earlier prefixes that are already
            // marked as dirty have precedence
          || this.get(subpath) === null) {
        pathToMark = subpath;
        break;
      }
    }

    if (!pathToMark) {
      pathToMark = path;
    }
  }

  // if this doc is being constructed we should not trigger getters
  var priorVal = constructing
      ? undefined
      : this.getValue(path);

  if (!schema) {
    this.$__set(pathToMark, path, constructing, parts, schema, val, priorVal);
    return this;
  }

  var shouldSet = true;
  try {
    // If the user is trying to set a ref path to a document with
    // the correct model name, treat it as populated
    var didPopulate = false;
    if (schema.options &&
        schema.options.ref &&
        val instanceof Document &&
        schema.options.ref === val.constructor.modelName) {
      if (this.ownerDocument) {
        this.ownerDocument().populated(this.$__fullPath(path),
          val._id, {model: val.constructor});
      } else {
        this.populated(path, val._id, {model: val.constructor});
      }
      didPopulate = true;
    }

    var popOpts;
    if (schema.options &&
        Array.isArray(schema.options.type) &&
        schema.options.type.length &&
        schema.options.type[0].ref &&
        Array.isArray(val) &&
        val.length > 0 &&
        val[0] instanceof Document &&
        val[0].constructor.modelName &&
        schema.options.type[0].ref === val[0].constructor.modelName) {
      if (this.ownerDocument) {
        popOpts = { model: val[0].constructor };
        this.ownerDocument().populated(this.$__fullPath(path),
          val.map(function(v) { return v._id; }), popOpts);
      } else {
        popOpts = { model: val[0].constructor };
        this.populated(path, val.map(function(v) { return v._id; }), popOpts);
      }
      didPopulate = true;
    }
    val = schema.applySetters(val, this, false, priorVal);

    if (!didPopulate && this.$__.populated) {
      delete this.$__.populated[path];
    }

    this.$markValid(path);
  } catch (e) {
    var reason;
    if (!(e instanceof MongooseError.CastError)) {
      reason = e;
    }
    this.invalidate(path,
        new MongooseError.CastError(schema.instance, val, path, reason));
    shouldSet = false;
  }

  if (shouldSet) {
    this.$__set(pathToMark, path, constructing, parts, schema, val, priorVal);
  }

  return this;
};

/**
 * Determine if we should mark this change as modified.
 *
 * @return {Boolean}
 * @api private
 * @method $__shouldModify
 * @memberOf Document
 */

Document.prototype.$__shouldModify = function(pathToMark, path, constructing, parts, schema, val, priorVal) {
  if (this.isNew) {
    return true;
  }

  if (undefined === val && !this.isSelected(path)) {
    // when a path is not selected in a query, its initial
    // value will be undefined.
    return true;
  }

  if (undefined === val && path in this.$__.activePaths.states.default) {
    // we're just unsetting the default value which was never saved
    return false;
  }

  if (!deepEqual(val, priorVal || this.get(path))) {
    return true;
  }

  if (!constructing &&
      val !== null &&
      val !== undefined &&
      path in this.$__.activePaths.states.default &&
      deepEqual(val, schema.getDefault(this, constructing))) {
    // a path with a default was $unset on the server
    // and the user is setting it to the same value again
    return true;
  }
  return false;
};

/**
 * Handles the actual setting of the value and marking the path modified if appropriate.
 *
 * @api private
 * @method $__set
 * @memberOf Document
 */

Document.prototype.$__set = function(pathToMark, path, constructing, parts, schema, val, priorVal) {
  Embedded = Embedded || require('./types/embedded');

  var shouldModify = this.$__shouldModify(pathToMark, path, constructing, parts,
    schema, val, priorVal);
  var _this = this;

  if (shouldModify) {
    this.markModified(pathToMark, val);

    // handle directly setting arrays (gh-1126)
    MongooseArray || (MongooseArray = require('./types/array'));
    if (val && val.isMongooseArray) {
      val._registerAtomic('$set', val);

      // Small hack for gh-1638: if we're overwriting the entire array, ignore
      // paths that were modified before the array overwrite
      this.$__.activePaths.forEach(function(modifiedPath) {
        if (modifiedPath.indexOf(path + '.') === 0) {
          _this.$__.activePaths.ignore(modifiedPath);
        }
      });
    }
  }

  var obj = this._doc,
      i = 0,
      l = parts.length;

  for (; i < l; i++) {
    var next = i + 1,
        last = next === l;

    if (last) {
      obj[parts[i]] = val;
    } else {
      if (obj[parts[i]] && utils.getFunctionName(obj[parts[i]].constructor) === 'Object') {
        obj = obj[parts[i]];
      } else if (obj[parts[i]] && obj[parts[i]] instanceof Embedded) {
        obj = obj[parts[i]];
      } else if (obj[parts[i]] && obj[parts[i]].$isSingleNested) {
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

Document.prototype.getValue = function(path) {
  return utils.getValue(path, this._doc);
};

/**
 * Sets a raw value for a path (no casting, setters, transformations)
 *
 * @param {String} path
 * @param {Object} value
 * @api private
 */

Document.prototype.setValue = function(path, val) {
  utils.setValue(path, val, this._doc);
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
 * @param {Schema|String|Number|Buffer|*} [type] optionally specify a type for on-the-fly attributes
 * @api public
 */

Document.prototype.get = function(path, type) {
  var adhoc;
  if (type) {
    adhoc = Schema.interpretAsType(path, type, this.schema.options);
  }

  var schema = this.$__path(path) || this.schema.virtualpath(path),
      pieces = path.split('.'),
      obj = this._doc;

  for (var i = 0, l = pieces.length; i < l; i++) {
    obj = obj === null || obj === void 0
        ? undefined
        : obj[pieces[i]];
  }

  if (adhoc) {
    obj = adhoc.cast(obj);
  }

  // Check if this path is populated - don't apply getters if it is,
  // because otherwise its a nested object. See gh-3357
  if (schema && !this.populated(path)) {
    obj = schema.applyGetters(obj, this);
  }

  return obj;
};

/**
 * Returns the schematype for the given `path`.
 *
 * @param {String} path
 * @api private
 * @method $__path
 * @memberOf Document
 */

Document.prototype.$__path = function(path) {
  var adhocs = this.$__.adhocPaths,
      adhocType = adhocs && adhocs[path];

  if (adhocType) {
    return adhocType;
  }
  return this.schema.path(path);
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

Document.prototype.markModified = function(path) {
  this.$__.activePaths.modify(path);
};

/**
 * Returns the list of paths that have been modified.
 *
 * @return {Array}
 * @api public
 */

Document.prototype.modifiedPaths = function() {
  var directModifiedPaths = Object.keys(this.$__.activePaths.states.modify);

  return directModifiedPaths.reduce(function(list, path) {
    var parts = path.split('.');
    return list.concat(parts.reduce(function(chains, part, i) {
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

Document.prototype.isModified = function(path) {
  return path
      ? !!~this.modifiedPaths().indexOf(path)
      : this.$__.activePaths.some('modify');
};

/**
 * Checks if a path is set to its default.
 *
 * ####Example
 *
 *     MyModel = mongoose.model('test', { name: { type: String, default: 'Val '} });
 *     var m = new MyModel();
 *     m.$isDefault('name');               // true
 *
 * @param {String} [path]
 * @return {Boolean}
 * @method $isDefault
 * @api public
 */

Document.prototype.$isDefault = function(path) {
  return (path in this.$__.activePaths.states.default);
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

Document.prototype.isDirectModified = function(path) {
  return (path in this.$__.activePaths.states.modify);
};

/**
 * Checks if `path` was initialized.
 *
 * @param {String} path
 * @return {Boolean}
 * @api public
 */

Document.prototype.isInit = function(path) {
  return (path in this.$__.activePaths.states.init);
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

Document.prototype.isSelected = function isSelected(path) {
  if (this.$__.selected) {
    if (path === '_id') {
      return this.$__.selected._id !== 0;
    }

    var paths = Object.keys(this.$__.selected),
        i = paths.length,
        inclusive = false,
        cur;

    if (i === 1 && paths[0] === '_id') {
      // only _id was selected.
      return this.$__.selected._id === 0;
    }

    while (i--) {
      cur = paths[i];
      if (cur === '_id') {
        continue;
      }
      inclusive = !!this.$__.selected[cur];
      break;
    }

    if (path in this.$__.selected) {
      return inclusive;
    }

    i = paths.length;
    var pathDot = path + '.';

    while (i--) {
      cur = paths[i];
      if (cur === '_id') {
        continue;
      }

      if (cur.indexOf(pathDot) === 0) {
        return inclusive;
      }

      if (pathDot.indexOf(cur + '.') === 0) {
        return inclusive;
      }
    }

    return !inclusive;
  }

  return true;
};

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
 * @param {Object} optional options internal options
 * @param {Function} optional callback called after validation completes, passing an error if one occurred
 * @return {Promise} Promise
 * @api public
 */

Document.prototype.validate = function(options, callback) {
  var _this = this;
  var Promise = PromiseProvider.get();
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  if (options && options.__noPromise) {
    this.$__validate(callback);
    return;
  }

  return new Promise.ES6(function(resolve, reject) {
    _this.$__validate(function(error) {
      callback && callback(error);
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

/*!
 * ignore
 */

Document.prototype.$__validate = function(callback) {
  var _this = this;
  var _complete = function() {
    var err = _this.$__.validationError;
    _this.$__.validationError = undefined;
    _this.emit('validate', _this);
    if (err) {
      for (var key in err.errors) {
        // Make sure cast errors persist
        if (!_this.__parent && err.errors[key] instanceof MongooseError.CastError) {
          _this.invalidate(key, err.errors[key]);
        }
      }

      return err;
    }
  };

  // only validate required fields when necessary
  var paths = Object.keys(this.$__.activePaths.states.require).filter(function(path) {
    if (!_this.isSelected(path) && !_this.isModified(path)) {
      return false;
    }
    return true;
  });

  paths = paths.concat(Object.keys(this.$__.activePaths.states.init));
  paths = paths.concat(Object.keys(this.$__.activePaths.states.modify));
  paths = paths.concat(Object.keys(this.$__.activePaths.states.default));

  if (paths.length === 0) {
    process.nextTick(function() {
      var err = _complete();
      if (err) {
        callback(err);
        return;
      }
      callback();
    });
  }

  var validating = {},
      total = 0;

  // gh-661: if a whole array is modified, make sure to run validation on all
  // the children as well
  for (var i = 0; i < paths.length; ++i) {
    var path = paths[i];
    var val = _this.getValue(path);
    if (val && val.isMongooseArray && !Buffer.isBuffer(val) && !val.isMongooseDocumentArray) {
      var numElements = val.length;
      for (var j = 0; j < numElements; ++j) {
        paths.push(path + '.' + j);
      }
    }
  }

  var complete = function() {
    var err = _complete();
    if (err) {
      callback(err);
      return;
    }
    callback();
  };

  var validatePath = function(path) {
    if (validating[path]) {
      return;
    }

    validating[path] = true;
    total++;

    process.nextTick(function() {
      var p = _this.schema.path(path);
      if (!p) {
        return --total || complete();
      }

      // If user marked as invalid or there was a cast error, don't validate
      if (!_this.$isValid(path)) {
        --total || complete();
        return;
      }

      var val = _this.getValue(path);
      p.doValidate(val, function(err) {
        if (err) {
          _this.invalidate(path, err, undefined, true);
        }
        --total || complete();
      }, _this);
    });
  };

  paths.forEach(validatePath);
};

/**
 * Executes registered validation rules (skipping asynchronous validators) for this document.
 *
 * ####Note:
 *
 * This method is useful if you need synchronous validation.
 *
 * ####Example:
 *
 *     var err = doc.validateSync();
 *     if ( err ){
 *       handleError( err );
 *     } else {
 *       // validation passed
 *     }
 *
 * @param {Array|string} pathsToValidate only validate the given paths
 * @return {MongooseError|undefined} MongooseError if there are errors during validation, or undefined if there is no error.
 * @api public
 */

Document.prototype.validateSync = function(pathsToValidate) {
  var _this = this;

  if (typeof pathsToValidate === 'string') {
    pathsToValidate = pathsToValidate.split(' ');
  }

  // only validate required fields when necessary
  var paths = Object.keys(this.$__.activePaths.states.require).filter(function(path) {
    if (!_this.isSelected(path) && !_this.isModified(path)) {
      return false;
    }
    return true;
  });

  paths = paths.concat(Object.keys(this.$__.activePaths.states.init));
  paths = paths.concat(Object.keys(this.$__.activePaths.states.modify));
  paths = paths.concat(Object.keys(this.$__.activePaths.states.default));

  if (pathsToValidate && pathsToValidate.length) {
    var tmp = [];
    for (var i = 0; i < paths.length; ++i) {
      if (pathsToValidate.indexOf(paths[i]) !== -1) {
        tmp.push(paths[i]);
      }
    }
    paths = tmp;
  }

  var validating = {};

  paths.forEach(function(path) {
    if (validating[path]) {
      return;
    }

    validating[path] = true;

    var p = _this.schema.path(path);
    if (!p) {
      return;
    }
    if (!_this.$isValid(path)) {
      return;
    }

    var val = _this.getValue(path);
    var err = p.doValidateSync(val, _this);
    if (err) {
      _this.invalidate(path, err, undefined, true);
    }
  });

  var err = _this.$__.validationError;
  _this.$__.validationError = undefined;
  _this.emit('validate', _this);

  if (err) {
    for (var key in err.errors) {
      // Make sure cast errors persist
      if (err.errors[key] instanceof MongooseError.CastError) {
        _this.invalidate(key, err.errors[key]);
      }
    }
  }

  return err;
};

/**
 * Marks a path as invalid, causing validation to fail.
 *
 * The `errorMsg` argument will become the message of the `ValidationError`.
 *
 * The `value` argument (if passed) will be available through the `ValidationError.value` property.
 *
 *     doc.invalidate('size', 'must be less than 20', 14);

 *     doc.validate(function (err) {
 *       console.log(err)
 *       // prints
 *       { message: 'Validation failed',
 *         name: 'ValidationError',
 *         errors:
 *          { size:
 *             { message: 'must be less than 20',
 *               name: 'ValidatorError',
 *               path: 'size',
 *               type: 'user defined',
 *               value: 14 } } }
 *     })
 *
 * @param {String} path the field to invalidate
 * @param {String|Error} errorMsg the error which states the reason `path` was invalid
 * @param {Object|String|Number|any} value optional invalid value
 * @return {ValidationError} the current ValidationError, with all currently invalidated paths
 * @api public
 */

Document.prototype.invalidate = function(path, err, val) {
  if (!this.$__.validationError) {
    this.$__.validationError = new ValidationError(this);
  }

  if (this.$__.validationError.errors[path]) {
    return;
  }

  if (!err || typeof err === 'string') {
    err = new ValidatorError({
      path: path,
      message: err,
      type: 'user defined',
      value: val
    });
  }

  if (this.$__.validationError === err) {
    return this.$__.validationError;
  }

  this.$__.validationError.errors[path] = err;
  return this.$__.validationError;
};

/**
 * Marks a path as valid, removing existing validation errors.
 *
 * @param {String} path the field to mark as valid
 * @api private
 * @method $markValid
 * @receiver Document
 */

Document.prototype.$markValid = function(path) {
  if (!this.$__.validationError || !this.$__.validationError.errors[path]) {
    return;
  }

  delete this.$__.validationError.errors[path];
  if (Object.keys(this.$__.validationError.errors).length === 0) {
    this.$__.validationError = null;
  }
};

/**
 * Checks if a path is invalid
 *
 * @param {String} path the field to check
 * @method $isValid
 * @api private
 * @receiver Document
 */

Document.prototype.$isValid = function(path) {
  return !this.$__.validationError || !this.$__.validationError.errors[path];
};

/**
 * Resets the internal modified state of this document.
 *
 * @api private
 * @return {Document}
 * @method $__reset
 * @memberOf Document
 */

Document.prototype.$__reset = function reset() {
  var _this = this;
  DocumentArray || (DocumentArray = require('./types/documentarray'));

  this.$__.activePaths
  .map('init', 'modify', function(i) {
    return _this.getValue(i);
  })
  .filter(function(val) {
    return val && val instanceof Array && val.isMongooseDocumentArray && val.length;
  })
  .forEach(function(array) {
    var i = array.length;
    while (i--) {
      var doc = array[i];
      if (!doc) {
        continue;
      }
      doc.$__reset();
    }
  });

  // clear atomics
  this.$__dirty().forEach(function(dirt) {
    var type = dirt.value;
    if (type && type._atomics) {
      type._atomics = {};
    }
  });

  // Clear 'dirty' cache
  this.$__.activePaths.clear('modify');
  this.$__.activePaths.clear('default');
  this.$__.validationError = undefined;
  this.errors = undefined;
  _this = this;
  this.schema.requiredPaths().forEach(function(path) {
    _this.$__.activePaths.require(path);
  });

  return this;
};

/**
 * Returns this documents dirty paths / vals.
 *
 * @api private
 * @method $__dirty
 * @memberOf Document
 */

Document.prototype.$__dirty = function() {
  var _this = this;

  var all = this.$__.activePaths.map('modify', function(path) {
    return {
      path: path,
      value: _this.getValue(path),
      schema: _this.$__path(path)
    };
  });

  // gh-2558: if we had to set a default and the value is not undefined,
  // we have to save as well
  all = all.concat(this.$__.activePaths.map('default', function(path) {
    if (path === '_id' || !_this.getValue(path)) {
      return;
    }
    return {
      path: path,
      value: _this.getValue(path),
      schema: _this.$__path(path)
    };
  }));

  // Sort dirty paths in a flat hierarchy.
  all.sort(function(a, b) {
    return (a.path < b.path ? -1 : (a.path > b.path ? 1 : 0));
  });

  // Ignore "foo.a" if "foo" is dirty already.
  var minimal = [],
      lastPath,
      top;

  all.forEach(function(item) {
    if (!item) {
      return;
    }
    if (item.path.indexOf(lastPath) !== 0) {
      lastPath = item.path + '.';
      minimal.push(item);
      top = item;
    } else {
      // special case for top level MongooseArrays
      if (top.value && top.value._atomics && top.value.hasAtomics()) {
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
};

/*!
 * Compiles schemas.
 */

function compile(tree, proto, prefix, options) {
  var keys = Object.keys(tree),
      i = keys.length,
      limb,
      key;

  while (i--) {
    key = keys[i];
    limb = tree[key];

    defineKey(key,
        ((utils.getFunctionName(limb.constructor) === 'Object'
        && Object.keys(limb).length)
        && (!limb[options.typeKey] || (options.typeKey === 'type' && limb.type.type))
            ? limb
            : null)
        , proto
        , prefix
        , keys
        , options);
  }
}

// gets descriptors for all properties of `object`
// makes all properties non-enumerable to match previous behavior to #2211
function getOwnPropertyDescriptors(object) {
  var result = {};

  Object.getOwnPropertyNames(object).forEach(function(key) {
    result[key] = Object.getOwnPropertyDescriptor(object, key);
    result[key].enumerable = true;
  });

  return result;
}

/*!
 * Defines the accessor named prop on the incoming prototype.
 */

function defineKey(prop, subprops, prototype, prefix, keys, options) {
  var path = (prefix ? prefix + '.' : '') + prop;
  prefix = prefix || '';

  if (subprops) {
    Object.defineProperty(prototype, prop, {
      enumerable: true,
      configurable: true,
      get: function() {
        var _this = this;
        if (!this.$__.getters) {
          this.$__.getters = {};
        }

        if (!this.$__.getters[path]) {
          var nested = Object.create(Object.getPrototypeOf(this), getOwnPropertyDescriptors(this));

          // save scope for nested getters/setters
          if (!prefix) {
            nested.$__.scope = this;
          }

          // shadow inherited getters from sub-objects so
          // thing.nested.nested.nested... doesn't occur (gh-366)
          var i = 0,
              len = keys.length;

          for (; i < len; ++i) {
            // over-write the parents getter without triggering it
            Object.defineProperty(nested, keys[i], {
              enumerable: false,    // It doesn't show up.
              writable: true,       // We can set it later.
              configurable: true,   // We can Object.defineProperty again.
              value: undefined      // It shadows its parent.
            });
          }

          Object.defineProperty(nested, 'toObject', {
            enumerable: true,
            configurable: true,
            writable: false,
            value: function() {
              return _this.get(path);
            }
          });

          Object.defineProperty(nested, 'toJSON', {
            enumerable: true,
            configurable: true,
            writable: false,
            value: function() {
              return _this.get(path);
            }
          });

          Object.defineProperty(nested, '$__isNested', {
            enumerable: true,
            configurable: true,
            writable: false,
            value: true
          });

          compile(subprops, nested, path, options);
          this.$__.getters[path] = nested;
        }

        return this.$__.getters[path];
      },
      set: function(v) {
        if (v instanceof Document) {
          v = v.toObject();
        }
        return (this.$__.scope || this).set(path, v);
      }
    });
  } else {
    Object.defineProperty(prototype, prop, {
      enumerable: true,
      configurable: true,
      get: function() {
        return this.get.call(this.$__.scope || this, path);
      },
      set: function(v) {
        return this.set.call(this.$__.scope || this, path, v);
      }
    });
  }
}

/**
 * Assigns/compiles `schema` into this documents prototype.
 *
 * @param {Schema} schema
 * @api private
 * @method $__setSchema
 * @memberOf Document
 */

Document.prototype.$__setSchema = function(schema) {
  compile(schema.tree, this, undefined, schema.options);
  this.schema = schema;
};


/**
 * Get active path that were changed and are arrays
 *
 * @api private
 * @method $__getArrayPathsToValidate
 * @memberOf Document
 */

Document.prototype.$__getArrayPathsToValidate = function() {
  DocumentArray || (DocumentArray = require('./types/documentarray'));

  // validate all document arrays.
  return this.$__.activePaths
  .map('init', 'modify', function(i) {
    return this.getValue(i);
  }.bind(this))
  .filter(function(val) {
    return val && val instanceof Array && val.isMongooseDocumentArray && val.length;
  }).reduce(function(seed, array) {
    return seed.concat(array);
  }, [])
  .filter(function(doc) {
    return doc;
  });
};


/**
 * Get all subdocs (by bfs)
 *
 * @api private
 * @method $__getAllSubdocs
 * @memberOf Document
 */

Document.prototype.$__getAllSubdocs = function() {
  DocumentArray || (DocumentArray = require('./types/documentarray'));
  Embedded = Embedded || require('./types/embedded');

  function docReducer(seed, path) {
    var val = this[path];

    if (val instanceof Embedded) {
      seed.push(val);
    }
    if (val && val.$isSingleNested) {
      seed = Object.keys(val._doc).reduce(docReducer.bind(val._doc), seed);
      seed.push(val);
    }
    if (val && val.isMongooseDocumentArray) {
      val.forEach(function _docReduce(doc) {
        if (!doc || !doc._doc) {
          return;
        }
        if (doc instanceof Embedded) {
          seed.push(doc);
        }
        seed = Object.keys(doc._doc).reduce(docReducer.bind(doc._doc), seed);
      });
    } else if (val instanceof Document && val.$__isNested) {
      val = val.toObject();
      if (val) {
        seed = Object.keys(val).reduce(docReducer.bind(val), seed);
      }
    }
    return seed;
  }

  var subDocs = Object.keys(this._doc).reduce(docReducer.bind(this), []);

  return subDocs;
};

/**
 * Executes methods queued from the Schema definition
 *
 * @api private
 * @method $__registerHooksFromSchema
 * @memberOf Document
 */

Document.prototype.$__registerHooksFromSchema = function() {
  Embedded = Embedded || require('./types/embedded');
  var Promise = PromiseProvider.get();

  var _this = this;
  var q = _this.schema && _this.schema.callQueue;
  if (!q.length) {
    return _this;
  }

  // we are only interested in 'pre' hooks, and group by point-cut
  var toWrap = q.reduce(function(seed, pair) {
    if (pair[0] !== 'pre' && pair[0] !== 'post' && pair[0] !== 'on') {
      _this[pair[0]].apply(_this, pair[1]);
      return seed;
    }
    var args = [].slice.call(pair[1]);
    var pointCut = pair[0] === 'on' ? 'post' : args[0];
    if (!(pointCut in seed)) {
      seed[pointCut] = {post: [], pre: []};
    }
    if (pair[0] === 'post') {
      seed[pointCut].post.push(args);
    } else if (pair[0] === 'on') {
      seed[pointCut].push(args);
    } else {
      seed[pointCut].pre.push(args);
    }
    return seed;
  }, {post: []});

  // 'post' hooks are simpler
  toWrap.post.forEach(function(args) {
    _this.on.apply(_this, args);
  });
  delete toWrap.post;

  // 'init' should be synchronous on subdocuments
  if (toWrap.init && _this instanceof Embedded) {
    if (toWrap.init.pre) {
      toWrap.init.pre.forEach(function(args) {
        _this.$pre.apply(_this, args);
      });
    }
    if (toWrap.init.post) {
      toWrap.init.post.forEach(function(args) {
        _this.$post.apply(_this, args);
      });
    }
    delete toWrap.init;
  } else if (toWrap.set) {
    // Set hooks also need to be sync re: gh-3479
    if (toWrap.set.pre) {
      toWrap.set.pre.forEach(function(args) {
        _this.$pre.apply(_this, args);
      });
    }
    if (toWrap.set.post) {
      toWrap.set.post.forEach(function(args) {
        _this.$post.apply(_this, args);
      });
    }
    delete toWrap.set;
  }

  Object.keys(toWrap).forEach(function(pointCut) {
    // this is so we can wrap everything into a promise;
    var newName = ('$__original_' + pointCut);
    if (!_this[pointCut]) {
      return;
    }
    _this[newName] = _this[pointCut];
    _this[pointCut] = function wrappedPointCut() {
      var args = [].slice.call(arguments);
      var lastArg = args.pop();
      var fn;

      return new Promise.ES6(function(resolve, reject) {
        if (lastArg && typeof lastArg !== 'function') {
          args.push(lastArg);
        } else {
          fn = lastArg;
        }
        args.push(function(error, result) {
          if (error) {
            _this.$__handleReject(error);
            fn && fn(error);
            reject(error);
            return;
          }

          fn && fn.apply(null, [null].concat(Array.prototype.slice.call(arguments, 1)));
          resolve(result);
        });

        _this[newName].apply(_this, args);
      });
    };

    toWrap[pointCut].pre.forEach(function(args) {
      args[0] = newName;
      _this.$pre.apply(_this, args);
    });
    toWrap[pointCut].post.forEach(function(args) {
      args[0] = newName;
      _this.$post.apply(_this, args);
    });
  });
  return _this;
};

Document.prototype.$__handleReject = function handleReject(err) {
  // emit on the Model if listening
  if (this.listeners('error').length) {
    this.emit('error', err);
  } else if (this.constructor.listeners && this.constructor.listeners('error').length) {
    this.constructor.emit('error', err);
  } else if (this.listeners && this.listeners('error').length) {
    this.emit('error', err);
  }
};

/**
 * Internal helper for toObject() and toJSON() that doesn't manipulate options
 *
 * @api private
 * @method $toObject
 * @memberOf Document
 */

Document.prototype.$toObject = function(options, json) {
  var defaultOptions = {transform: true, json: json};

  if (options && options.depopulate && !options._skipDepopulateTopLevel && this.$__.wasPopulated) {
    // populated paths that we set to a document
    return clone(this._id, options);
  }

  // If we're calling toObject on a populated doc, we may want to skip
  // depopulated on the top level
  if (options && options._skipDepopulateTopLevel) {
    options._skipDepopulateTopLevel = false;
  }

  // When internally saving this document we always pass options,
  // bypassing the custom schema options.
  if (!(options && utils.getFunctionName(options.constructor) === 'Object') ||
      (options && options._useSchemaOptions)) {
    if (json) {
      options = this.schema.options.toJSON ?
          clone(this.schema.options.toJSON) :
      {};
      options.json = true;
      options._useSchemaOptions = true;
    } else {
      options = this.schema.options.toObject ?
          clone(this.schema.options.toObject) :
      {};
      options.json = false;
      options._useSchemaOptions = true;
    }
  }

  for (var key in defaultOptions) {
    if (options[key] === undefined) {
      options[key] = defaultOptions[key];
    }
  }

  ('minimize' in options) || (options.minimize = this.schema.options.minimize);

  // remember the root transform function
  // to save it from being overwritten by sub-transform functions
  var originalTransform = options.transform;

  var ret = clone(this._doc, options) || {};

  if (options.getters) {
    applyGetters(this, ret, 'paths', options);
    // applyGetters for paths will add nested empty objects;
    // if minimize is set, we need to remove them.
    if (options.minimize) {
      ret = minimize(ret) || {};
    }
  }

  if (options.virtuals || options.getters && options.virtuals !== false) {
    applyGetters(this, ret, 'virtuals', options);
  }

  if (options.versionKey === false && this.schema.options.versionKey) {
    delete ret[this.schema.options.versionKey];
  }

  var transform = options.transform;

  // In the case where a subdocument has its own transform function, we need to
  // check and see if the parent has a transform (options.transform) and if the
  // child schema has a transform (this.schema.options.toObject) In this case,
  // we need to adjust options.transform to be the child schema's transform and
  // not the parent schema's
  if (transform === true ||
      (this.schema.options.toObject && transform)) {
    var opts = options.json ? this.schema.options.toJSON : this.schema.options.toObject;

    if (opts) {
      transform = (typeof options.transform === 'function' ? options.transform : opts.transform);
    }
  } else {
    options.transform = originalTransform;
  }

  if (typeof transform === 'function') {
    var xformed = transform(this, ret, options);
    if (typeof xformed !== 'undefined') {
      ret = xformed;
    }
  }

  return ret;
};

/**
 * Converts this document into a plain javascript object, ready for storage in MongoDB.
 *
 * Buffers are converted to instances of [mongodb.Binary](http://mongodb.github.com/node-mongodb-native/api-bson-generated/binary.html) for proper storage.
 *
 * ####Options:
 *
 * - `getters` apply all getters (path and virtual getters)
 * - `virtuals` apply virtual getters (can override `getters` option)
 * - `minimize` remove empty objects (defaults to true)
 * - `transform` a transform function to apply to the resulting document before returning
 * - `depopulate` depopulate any populated paths, replacing them with their original refs (defaults to false)
 * - `versionKey` whether to include the version key (defaults to true)
 * - `retainKeyOrder` keep the order of object keys. If this is set to true, `Object.keys(new Doc({ a: 1, b: 2}).toObject())` will always produce `['a', 'b']` (defaults to false)
 *
 * ####Getters/Virtuals
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
 * To apply these options to every document of your schema by default, set your [schemas](#schema_Schema) `toObject` option to the same argument.
 *
 *     schema.set('toObject', { virtuals: true })
 *
 * ####Transform
 *
 * We may need to perform a transformation of the resulting object based on some criteria, say to remove some sensitive information or return a custom object. In this case we set the optional `transform` function.
 *
 * Transform functions receive three arguments
 *
 *     function (doc, ret, options) {}
 *
 * - `doc` The mongoose document which is being converted
 * - `ret` The plain object representation which has been converted
 * - `options` The options in use (either schema options or the options passed inline)
 *
 * ####Example
 *
 *     // specify the transform schema option
 *     if (!schema.options.toObject) schema.options.toObject = {};
 *     schema.options.toObject.transform = function (doc, ret, options) {
 *       // remove the _id of every document before returning the result
 *       delete ret._id;
 *     }
 *
 *     // without the transformation in the schema
 *     doc.toObject(); // { _id: 'anId', name: 'Wreck-it Ralph' }
 *
 *     // with the transformation
 *     doc.toObject(); // { name: 'Wreck-it Ralph' }
 *
 * With transformations we can do a lot more than remove properties. We can even return completely new customized objects:
 *
 *     if (!schema.options.toObject) schema.options.toObject = {};
 *     schema.options.toObject.transform = function (doc, ret, options) {
 *       return { movie: ret.name }
 *     }
 *
 *     // without the transformation in the schema
 *     doc.toObject(); // { _id: 'anId', name: 'Wreck-it Ralph' }
 *
 *     // with the transformation
 *     doc.toObject(); // { movie: 'Wreck-it Ralph' }
 *
 * _Note: if a transform function returns `undefined`, the return value will be ignored._
 *
 * Transformations may also be applied inline, overridding any transform set in the options:
 *
 *     function xform (doc, ret, options) {
 *       return { inline: ret.name, custom: true }
 *     }
 *
 *     // pass the transform as an inline option
 *     doc.toObject({ transform: xform }); // { inline: 'Wreck-it Ralph', custom: true }
 *
 * _Note: if you call `toObject` and pass any options, the transform declared in your schema options will __not__ be applied. To force its application pass `transform: true`_
 *
 *     if (!schema.options.toObject) schema.options.toObject = {};
 *     schema.options.toObject.hide = '_id';
 *     schema.options.toObject.transform = function (doc, ret, options) {
 *       if (options.hide) {
 *         options.hide.split(' ').forEach(function (prop) {
 *           delete ret[prop];
 *         });
 *       }
 *     }
 *
 *     var doc = new Doc({ _id: 'anId', secret: 47, name: 'Wreck-it Ralph' });
 *     doc.toObject();                                        // { secret: 47, name: 'Wreck-it Ralph' }
 *     doc.toObject({ hide: 'secret _id' });                  // { _id: 'anId', secret: 47, name: 'Wreck-it Ralph' }
 *     doc.toObject({ hide: 'secret _id', transform: true }); // { name: 'Wreck-it Ralph' }
 *
 * Transforms are applied _only to the document and are not applied to sub-documents_.
 *
 * Transforms, like all of these options, are also available for `toJSON`.
 *
 * See [schema options](/docs/guide.html#toObject) for some more details.
 *
 * _During save, no custom options are applied to the document before being sent to the database._
 *
 * @param {Object} [options]
 * @return {Object} js object
 * @see mongodb.Binary http://mongodb.github.com/node-mongodb-native/api-bson-generated/binary.html
 * @api public
 */

Document.prototype.toObject = function(options) {
  return this.$toObject(options);
};

/*!
 * Minimizes an object, removing undefined values and empty objects
 *
 * @param {Object} object to minimize
 * @return {Object}
 */

function minimize(obj) {
  var keys = Object.keys(obj),
      i = keys.length,
      hasKeys,
      key,
      val;

  while (i--) {
    key = keys[i];
    val = obj[key];

    if (utils.isObject(val)) {
      obj[key] = minimize(val);
    }

    if (undefined === obj[key]) {
      delete obj[key];
      continue;
    }

    hasKeys = true;
  }

  return hasKeys
      ? obj
      : undefined;
}

/*!
 * Applies virtuals properties to `json`.
 *
 * @param {Document} self
 * @param {Object} json
 * @param {String} type either `virtuals` or `paths`
 * @return {Object} `json`
 */

function applyGetters(self, json, type, options) {
  var schema = self.schema,
      paths = Object.keys(schema[type]),
      i = paths.length,
      path;

  while (i--) {
    path = paths[i];

    var parts = path.split('.'),
        plen = parts.length,
        last = plen - 1,
        branch = json,
        part;

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
 * This method accepts the same options as [Document#toObject](#document_Document-toObject). To apply the options to every document of your schema by default, set your [schemas](#schema_Schema) `toJSON` option to the same argument.
 *
 *     schema.set('toJSON', { virtuals: true })
 *
 * See [schema options](/docs/guide.html#toJSON) for details.
 *
 * @param {Object} options
 * @return {Object}
 * @see Document#toObject #document_Document-toObject
 * @api public
 */

Document.prototype.toJSON = function(options) {
  return this.$toObject(options, true);
};

/**
 * Helper for console.log
 *
 * @api public
 */

Document.prototype.inspect = function(options) {
  var opts = options && utils.getFunctionName(options.constructor) === 'Object' ? options : {};
  opts.minimize = false;
  opts.retainKeyOrder = true;
  return this.toObject(opts);
};

/**
 * Helper for console.log
 *
 * @api public
 * @method toString
 */

Document.prototype.toString = function() {
  return inspect(this.inspect());
};

/**
 * Returns true if the Document stores the same data as doc.
 *
 * Documents are considered equal when they have matching `_id`s, unless neither
 * document has an `_id`, in which case this function falls back to using
 * `deepEqual()`.
 *
 * @param {Document} doc a document to compare
 * @return {Boolean}
 * @api public
 */

Document.prototype.equals = function(doc) {
  var tid = this.get('_id');
  var docid = doc.get ? doc.get('_id') : doc;
  if (!tid && !docid) {
    return deepEqual(this, doc);
  }
  return tid && tid.equals
      ? tid.equals(docid)
      : tid === docid;
};

/**
 * Populates document references, executing the `callback` when complete.
 * If you want to use promises instead, use this function with
 * [`execPopulate()`](#document_Document-execPopulate)
 *
 * ####Example:
 *
 *     doc
 *     .populate('company')
 *     .populate({
 *       path: 'notes',
 *       match: /airline/,
 *       select: 'text',
 *       model: 'modelName'
 *       options: opts
 *     }, function (err, user) {
 *       assert(doc._id === user._id) // the document itself is passed
 *     })
 *
 *     // summary
 *     doc.populate(path)                   // not executed
 *     doc.populate(options);               // not executed
 *     doc.populate(path, callback)         // executed
 *     doc.populate(options, callback);     // executed
 *     doc.populate(callback);              // executed
 *     doc.populate(options).execPopulate() // executed, returns promise
 *
 *
 * ####NOTE:
 *
 * Population does not occur unless a `callback` is passed *or* you explicitly
 * call `execPopulate()`.
 * Passing the same path a second time will overwrite the previous path options.
 * See [Model.populate()](#model_Model.populate) for explaination of options.
 *
 * @see Model.populate #model_Model.populate
 * @see Document.execPopulate #document_Document-execPopulate
 * @param {String|Object} [path] The path to populate or an options object
 * @param {Function} [callback] When passed, population is invoked
 * @api public
 * @return {Document} this
 */

Document.prototype.populate = function populate() {
  if (arguments.length === 0) {
    return this;
  }

  var pop = this.$__.populate || (this.$__.populate = {});
  var args = utils.args(arguments);
  var fn;

  if (typeof args[args.length - 1] === 'function') {
    fn = args.pop();
  }

  // allow `doc.populate(callback)`
  if (args.length) {
    // use hash to remove duplicate paths
    var res = utils.populate.apply(null, args);
    for (var i = 0; i < res.length; ++i) {
      pop[res[i].path] = res[i];
    }
  }

  if (fn) {
    var paths = utils.object.vals(pop);
    this.$__.populate = undefined;
    paths.__noPromise = true;
    this.constructor.populate(this, paths, fn);
  }

  return this;
};

/**
 * Explicitly executes population and returns a promise. Useful for ES2015
 * integration.
 *
 * ####Example:
 *
 *     var promise = doc.
 *       populate('company').
 *       populate({
 *         path: 'notes',
 *         match: /airline/,
 *         select: 'text',
 *         model: 'modelName'
 *         options: opts
 *       }).
 *       execPopulate();
 *
 *     // summary
 *     doc.execPopulate().then(resolve, reject);
 *
 *
 * @see Document.populate #Document_model.populate
 * @api public
 * @return {Promise} promise that resolves to the document when population is done
 */

Document.prototype.execPopulate = function() {
  var Promise = PromiseProvider.get();
  var _this = this;
  return new Promise.ES6(function(resolve, reject) {
    _this.populate(function(error, res) {
      if (error) {
        reject(error);
      } else {
        resolve(res);
      }
    });
  });
};

/**
 * Gets _id(s) used during population of the given `path`.
 *
 * ####Example:
 *
 *     Model.findOne().populate('author').exec(function (err, doc) {
 *       console.log(doc.author.name)         // Dr.Seuss
 *       console.log(doc.populated('author')) // '5144cf8050f071d979c118a7'
 *     })
 *
 * If the path was not populated, undefined is returned.
 *
 * @param {String} path
 * @return {Array|ObjectId|Number|Buffer|String|undefined}
 * @api public
 */

Document.prototype.populated = function(path, val, options) {
  // val and options are internal

  if (val === null || val === void 0) {
    if (!this.$__.populated) {
      return undefined;
    }
    var v = this.$__.populated[path];
    if (v) {
      return v.value;
    }
    return undefined;
  }

  // internal

  if (val === true) {
    if (!this.$__.populated) {
      return undefined;
    }
    return this.$__.populated[path];
  }

  this.$__.populated || (this.$__.populated = {});
  this.$__.populated[path] = {value: val, options: options};
  return val;
};

/**
 * Takes a populated field and returns it to its unpopulated state.
 *
 * ####Example:
 *
 *     Model.findOne().populate('author').exec(function (err, doc) {
 *       console.log(doc.author.name); // Dr.Seuss
 *       console.log(doc.depopulate('author'));
 *       console.log(doc.author); // '5144cf8050f071d979c118a7'
 *     })
 *
 * If the path was not populated, this is a no-op.
 *
 * @param {String} path
 * @api public
 */

Document.prototype.depopulate = function(path) {
  var populatedIds = this.populated(path);
  if (!populatedIds) {
    return;
  }
  delete this.$__.populated[path];
  this.set(path, populatedIds);
};


/**
 * Returns the full path to this document.
 *
 * @param {String} [path]
 * @return {String}
 * @api private
 * @method $__fullPath
 * @memberOf Document
 */

Document.prototype.$__fullPath = function(path) {
  // overridden in SubDocuments
  return path || '';
};

/*!
 * Module exports.
 */

Document.ValidationError = ValidationError;
module.exports = exports = Document;
