'use strict';

/*!
 * Module dependencies.
 */

const EventEmitter = require('events').EventEmitter;
const InternalCache = require('./internal');
const MongooseError = require('./error');
const MixedSchema = require('./schema/mixed');
const Schema = require('./schema');
const ObjectExpectedError = require('./error/objectExpected');
const ObjectParameterError = require('./error/objectParameter');
const StrictModeError = require('./error/strict');
const ValidatorError = require('./schematype').ValidatorError;
const VirtualType = require('./virtualtype');
const cleanModifiedSubpaths = require('./services/document/cleanModifiedSubpaths');
const compile = require('./services/document/compile').compile;
const defineKey = require('./services/document/compile').defineKey;
const flatten = require('./services/common').flatten;
const get = require('lodash.get');
const idGetter = require('./plugins/idGetter');
const isDefiningProjection = require('./services/projection/isDefiningProjection');
const isExclusive = require('./services/projection/isExclusive');
const inspect = require('util').inspect;
const internalToObjectOptions = require('./options').internalToObjectOptions;
const mpath = require('mpath');
const utils = require('./utils');

const ValidationError = MongooseError.ValidationError;
const clone = utils.clone;
const deepEqual = utils.deepEqual;
const isMongooseObject = utils.isMongooseObject;

let DocumentArray;
let MongooseArray;
let Embedded;

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

function Document(obj, fields, skipId, options) {
  if (typeof skipId === 'object' && skipId != null) {
    options = skipId;
    skipId = options.skipId;
  }
  options = options || {};

  this.$__ = new InternalCache;
  this.$__.emitter = new EventEmitter();
  this.isNew = 'isNew' in options ? options.isNew : true;
  this.errors = undefined;
  this.$__.$options = options || {};

  if (obj != null && typeof obj !== 'object') {
    throw new ObjectParameterError(obj, 'obj', 'Document');
  }

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

  let exclude = null;

  // determine if this doc is a result of a query with
  // excluded fields
  if (fields && utils.getFunctionName(fields.constructor) === 'Object') {
    exclude = isExclusive(fields);
  }

  let hasIncludedChildren = exclude === false && fields ?
    $__hasIncludedChildren(fields) :
    {};

  this.$__buildDoc(obj, fields, skipId, exclude, hasIncludedChildren, false);

  // By default, defaults get applied **before** setting initial values
  // Re: gh-6155
  $__applyDefaults(this, fields, skipId, exclude, hasIncludedChildren, true);

  if (obj) {
    if (obj instanceof Document) {
      this.isNew = obj.isNew;
    }
    // Skip set hooks
    if (this.$__original_set) {
      this.$__original_set(obj, undefined, true);
    } else {
      this.$set(obj, undefined, true);
    }
  }

  // Function defaults get applied **after** setting initial values so they
  // see the full doc rather than an empty one, unless they opt out.
  // Re: gh-3781, gh-6155
  $__applyDefaults(this, fields, skipId, exclude, hasIncludedChildren, false, options.skipDefaults);

  this.$__._id = this._id;

  if (!schema.options.strict && obj) {
    var _this = this,
        keys = Object.keys(this._doc);

    keys.forEach(function(key) {
      if (!(key in schema.tree)) {
        defineKey(key, null, _this);
      }
    });
  }

  applyQueue(this);
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
 * @memberOf Document
 */

Document.prototype.schema;

/**
 * Boolean flag specifying if the document is new.
 *
 * @api public
 * @property isNew
 * @memberOf Document
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
 * @memberOf Document
 */

Document.prototype.id;

/**
 * Hash containing current validation errors.
 *
 * @api public
 * @property errors
 * @memberOf Document
 */

Document.prototype.errors;

/*!
 * ignore
 */

function $__hasIncludedChildren(fields) {
  let hasIncludedChildren = {};
  let keys = Object.keys(fields);
  for (var j = 0; j < keys.length; ++j) {
    let parts = keys[j].split('.');
    let c = [];
    for (var k = 0; k < parts.length; ++k) {
      c.push(parts[k]);
      hasIncludedChildren[c.join('.')] = 1;
    }
  }

  return hasIncludedChildren;
}

/*!
 * ignore
 */

function $__applyDefaults(doc, fields, skipId, exclude, hasIncludedChildren, isBeforeSetters, pathsToSkip) {
  const paths = Object.keys(doc.schema.paths);
  const plen = paths.length;

  for (let i = 0; i < plen; ++i) {
    let def;
    let curPath = '';
    let p = paths[i];

    if (p === '_id' && skipId) {
      continue;
    }

    let type = doc.schema.paths[p];
    let path = p.split('.');
    let len = path.length;
    let included = false;
    let doc_ = doc._doc;

    for (let j = 0; j < len; ++j) {
      if (doc_ == null) {
        break;
      }

      let piece = path[j];
      curPath += (!curPath.length ? '' : '.') + piece;

      if (exclude === true) {
        if (curPath in fields) {
          break;
        }
      } else if (exclude === false && fields && !included) {
        if (curPath in fields) {
          included = true;
        } else if (!hasIncludedChildren[curPath]) {
          break;
        }
      }

      if (j === len - 1) {
        if (doc_[piece] !== void 0) {
          break;
        }

        if (typeof type.defaultValue === 'function') {
          if (!type.defaultValue.$runBeforeSetters && isBeforeSetters) {
            break;
          }
          if (type.defaultValue.$runBeforeSetters && !isBeforeSetters) {
            break;
          }
        } else if (!isBeforeSetters) {
          // Non-function defaults should always run **before** setters
          continue;
        }

        if (pathsToSkip && pathsToSkip[curPath]) {
          break;
        }

        if (fields && exclude !== null) {
          if (exclude === true) {
            // apply defaults to all non-excluded fields
            if (p in fields) {
              continue;
            }

            def = type.getDefault(doc, false);
            if (typeof def !== 'undefined') {
              doc_[piece] = def;
              doc.$__.activePaths.default(p);
            }
          } else if (included) {
            // selected field
            def = type.getDefault(doc, false);
            if (typeof def !== 'undefined') {
              doc_[piece] = def;
              doc.$__.activePaths.default(p);
            }
          }
        } else {
          def = type.getDefault(doc, false);
          if (typeof def !== 'undefined') {
            doc_[piece] = def;
            doc.$__.activePaths.default(p);
          }
        }
      } else {
        doc_ = doc_[piece];
      }
    }
  }
}

/**
 * Builds the default doc structure
 *
 * @param {Object} obj
 * @param {Object} [fields]
 * @param {Boolean} [skipId]
 * @api private
 * @method $__buildDoc
 * @memberOf Document
 */

Document.prototype.$__buildDoc = function(obj, fields, skipId, exclude, hasIncludedChildren) {
  const doc = {};

  const paths = Object.keys(this.schema.paths).
    // Don't build up any paths that are underneath a map, we don't know
    // what the keys will be
    filter(p => !p.includes('$*'));
  const plen = paths.length;
  let ii = 0;

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

    const path = p.split('.');
    const len = path.length;
    const last = len - 1;
    let curPath = '';
    let doc_ = doc;
    let included = false;

    for (let i = 0; i < len; ++i) {
      const piece = path[i];

      curPath += (!curPath.length ? '' : '.') + piece;

      // support excluding intermediary levels
      if (exclude === true) {
        if (curPath in fields) {
          break;
        }
      } else if (exclude === false && fields && !included) {
        if (curPath in fields) {
          included = true;
        } else if (!hasIncludedChildren[curPath]) {
          break;
        }
      }

      if (i < last) {
        doc_ = doc_[piece] || (doc_[piece] = {});
      }
    }
  }

  this._doc = doc;
};

/*!
 * Converts to POJO when you use the document for querying
 */

Document.prototype.toBSON = function() {
  return this.toObject(internalToObjectOptions);
};

/**
 * Initializes the document without setters or marking anything modified.
 *
 * Called internally after a document is returned from mongodb.
 *
 * @param {Object} doc document returned by mongo
 * @api public
 * @memberOf Document
 */

Document.prototype.init = function(doc, opts, fn) {
  if (typeof opts === 'function') {
    fn = opts;
    opts = null;
  }

  this.$__init(doc, opts);

  if (fn) {
    fn(null, this);
  }

  return this;
};

/*!
 * ignore
 */

Document.prototype.$__init = function(doc, opts) {
  this.isNew = false;
  this.$init = true;

  // handle docs with populated paths
  // If doc._id is not null or undefined
  if (doc._id !== null && doc._id !== undefined &&
    opts && opts.populated && opts.populated.length) {
    var id = String(doc._id);
    for (var i = 0; i < opts.populated.length; ++i) {
      var item = opts.populated[i];
      if (item.isVirtual) {
        this.populated(item.path, utils.getValue(item.path, doc), item);
      } else {
        this.populated(item.path, item._docs[id], item);
      }
    }
  }

  init(this, doc, this._doc);

  this.emit('init', this);
  this.constructor.emit('init', this);

  this.$__._id = this._id;

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

  var keys = Object.keys(obj);
  var len = keys.length;
  var schema;
  var path;
  var i;
  var index = 0;

  while (index < len) {
    _init(index++);
  }

  function _init(index) {
    i = keys[index];
    path = prefix + i;
    schema = self.schema.path(path);

    // Should still work if not a model-level discriminator, but should not be
    // necessary. This is *only* to catch the case where we queried using the
    // base model and the discriminated model has a projection
    if (self.schema.$isRootDiscriminator && !self.isSelected(path)) {
      return;
    }

    if (!schema && utils.isObject(obj[i]) &&
        (!obj[i].constructor || utils.getFunctionName(obj[i].constructor) === 'Object')) {
      // assume nested object
      if (!doc[i]) {
        doc[i] = {};
      }
      init(self, obj[i], doc[i], path + '.');
    } else if (!schema) {
      doc[i] = obj[i];
    } else {
      if (obj[i] === null) {
        doc[i] = null;
      } else if (obj[i] !== undefined) {
        let intCache = obj[i].$__ || {};
        let wasPopulated = intCache.wasPopulated || null;
        if (schema && !wasPopulated) {
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
 * @memberOf Document
 */

Document.prototype.update = function update() {
  var args = utils.args(arguments);
  args.unshift({_id: this._id});
  return this.constructor.update.apply(this.constructor, args);
};

/**
 * Getter/setter around the session associated with this document. Used to
 * automatically set `session` if you `save()` a doc that you got from a
 * query with an associated session.
 *
 * @param {ClientSession} [session] overwrite the current session
 * @return {ClientSession}
 * @method $session
 * @api public
 * @memberOf Document
 */

Document.prototype.$session = function $session(session) {
  if (arguments.length === 0) {
    return this.$__.session;
  }
  this.$__.session = session;
  return session;
};

/**
 * Alias for `set()`, used internally to avoid conflicts
 *
 * @param {String|Object} path path or object of key/vals to set
 * @param {Any} val the value to set
 * @param {Schema|String|Number|Buffer|*} [type] optionally specify a type for "on-the-fly" attributes
 * @param {Object} [options] optionally specify options that modify the behavior of the set
 * @method $set
 * @name $set
 * @memberOf Document
 * @api public
 */

Document.prototype.$set = function $set(path, val, type, options) {
  if (type && utils.getFunctionName(type.constructor) === 'Object') {
    options = type;
    type = undefined;
  }

  options = options || {};
  var merge = options.merge;
  var adhoc = type && type !== true;
  var constructing = type === true;
  var adhocs;

  var strict = 'strict' in options
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
      var prefix = val ? val + '.' : '';

      if (path instanceof Document) {
        if (path.$__isNested) {
          path = path.toObject();
        } else {
          path = path._doc;
        }
      }

      var keys = Object.keys(path);
      var len = keys.length;
      var i = 0;
      var pathtype;
      var key;

      if (len === 0 && !this.schema.options.minimize) {
        if (val) {
          this.$set(val, {});
        }
        return this;
      }

      while (i < len) {
        _handleIndex.call(this, i++);
      }

      return this;
    }
  }

  function _handleIndex(i) {
    key = keys[i];
    var pathName = prefix + key;
    pathtype = this.schema.pathType(pathName);

    if (path[key] !== null &&
        path[key] !== void 0 &&
        // need to know if plain object - no Buffer, ObjectId, ref, etc
        utils.isObject(path[key]) &&
        (!path[key].constructor || utils.getFunctionName(path[key].constructor) === 'Object') &&
        pathtype !== 'virtual' &&
        pathtype !== 'real' &&
        !(this.$__path(pathName) instanceof MixedSchema) &&
        !(this.schema.paths[pathName] &&
        this.schema.paths[pathName].options &&
        this.schema.paths[pathName].options.ref)) {
      this.$set(path[key], prefix + key, constructing);
    } else if (strict) {
      // Don't overwrite defaults with undefined keys (gh-3981)
      if (constructing && path[key] === void 0 &&
          this.get(key) !== void 0) {
        return;
      }

      if (pathtype === 'real' || pathtype === 'virtual') {
        // Check for setting single embedded schema to document (gh-3535)
        var p = path[key];
        if (this.schema.paths[pathName] &&
            this.schema.paths[pathName].$isSingleNested &&
            path[key] instanceof Document) {
          p = p.toObject({ virtuals: false, transform: false });
        }
        this.$set(prefix + key, p, constructing);
      } else if (pathtype === 'nested' && path[key] instanceof Document) {
        this.$set(prefix + key,
          path[key].toObject({transform: false}), constructing);
      } else if (strict === 'throw') {
        if (pathtype === 'nested') {
          throw new ObjectExpectedError(key, path[key]);
        } else {
          throw new StrictModeError(key);
        }
      }
    } else if (path[key] !== void 0) {
      this.$set(prefix + key, path[key], constructing);
    }
  }

  var pathType = this.schema.pathType(path);
  if (pathType === 'nested' && val) {
    if (utils.isObject(val) &&
        (!val.constructor || utils.getFunctionName(val.constructor) === 'Object')) {
      if (!merge) {
        this.setValue(path, null);
        cleanModifiedSubpaths(this, path);
      } else {
        return this.$set(val, path, constructing);
      }

      const keys = Object.keys(val);
      this.setValue(path, {});
      for (const key of keys) {
        this.$set(path + '.' + key, val[key], constructing);
      }
      this.markModified(path);
      cleanModifiedSubpaths(this, path, { skipDocArrays: true });
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

      // If path is underneath a virtual, bypass everything and just set it.
      if (i + 1 < parts.length && this.schema.pathType(subpath) === 'virtual') {
        mpath.set(path, val, this);
        return this;
      }

      schema = this.schema.path(subpath);
      if (schema == null) {
        continue;
      }

      if (schema instanceof MixedSchema) {
        // allow changes to sub paths of mixed types
        mixed = true;
        break;
      }

      // Find embedded discriminators
      if (schema.$isSingleNested && schema.schema.discriminators != null) {
        const discriminators = schema.schema.discriminators;
        const discriminatorKey = this.get(subpath + '.' +
          get(schema, 'schema.options.discriminatorKey'));
        if (discriminatorKey == null || discriminators[discriminatorKey] == null) {
          continue;
        }
        const rest = parts.slice(i + 1).join('.');
        schema = discriminators[discriminatorKey].path(rest);
        if (schema != null) {
          break;
        }
      }
    }

    if (!mixed && !schema) {
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

  // gh-4578, if setting a deeply nested path that doesn't exist yet, create it
  var cur = this._doc;
  var curPath = '';
  for (i = 0; i < parts.length - 1; ++i) {
    cur = cur[parts[i]];
    curPath += (curPath.length > 0 ? '.' : '') + parts[i];
    if (!cur) {
      this.$set(curPath, {});
      // Hack re: gh-5800. If nested field is not selected, it probably exists
      // so `MongoError: cannot use the part (nested of nested.num) to
      // traverse the element ({nested: null})` is not likely. If user gets
      // that error, its their fault for now. We should reconsider disallowing
      // modifying not selected paths for 6.x
      if (!this.isSelected(curPath)) {
        this.unmarkModified(curPath);
      }
      cur = this.getValue(curPath);
    }
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
  var priorVal = constructing ?
    undefined :
    this.getValue(path);

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
        (schema.options.ref === val.constructor.modelName || schema.options.ref === val.constructor.baseModelName)) {
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
        Array.isArray(schema.options[this.schema.options.typeKey]) &&
        schema.options[this.schema.options.typeKey].length &&
        schema.options[this.schema.options.typeKey][0].ref &&
        Array.isArray(val) &&
        val.length > 0 &&
        val[0] instanceof Document &&
        val[0].constructor.modelName &&
        (schema.options[this.schema.options.typeKey][0].ref === val[0].constructor.baseModelName || schema.options[this.schema.options.typeKey][0].ref === val[0].constructor.modelName)) {
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

    var setterContext = constructing && this.$__.$options.priorDoc ?
      this.$__.$options.priorDoc :
      this;
    val = schema.applySetters(val, setterContext, false, priorVal);

    if (!didPopulate && this.$__.populated) {
      delete this.$__.populated[path];
    }

    this.$markValid(path);
  } catch (e) {
    this.invalidate(path,
      new MongooseError.CastError(schema.instance, val, path, e));
    shouldSet = false;
  }

  if (shouldSet) {
    this.$__set(pathToMark, path, constructing, parts, schema, val, priorVal);
  }

  if (schema.$isSingleNested && (this.isDirectModified(path) || val == null)) {
    cleanModifiedSubpaths(this, path);
  }

  return this;
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
 * @method set
 * @memberOf Document
 */

Document.prototype.set = Document.prototype.$set;

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

  // gh-3992: if setting a populated field to a doc, don't mark modified
  // if they have the same _id
  if (this.populated(path) &&
      val instanceof Document &&
      deepEqual(val._id, priorVal)) {
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
    this.markModified(pathToMark);

    // handle directly setting arrays (gh-1126)
    MongooseArray || (MongooseArray = require('./types/array'));
    if (val && val.isMongooseArray) {
      val._registerAtomic('$set', val);

      // Update embedded document parent references (gh-5189)
      if (val.isMongooseDocumentArray) {
        val.forEach(function(item) {
          item && item.__parentArray && (item.__parentArray = val);
        });
      }

      // Small hack for gh-1638: if we're overwriting the entire array, ignore
      // paths that were modified before the array overwrite
      this.$__.activePaths.forEach(function(modifiedPath) {
        if (modifiedPath.indexOf(path + '.') === 0) {
          _this.$__.activePaths.ignore(modifiedPath);
        }
      });
    }
  }

  var obj = this._doc;
  var i = 0;
  var l = parts.length;
  var cur = '';

  for (; i < l; i++) {
    var next = i + 1;
    var last = next === l;
    cur += (cur ? '.' + parts[i] : parts[i]);

    if (last) {
      if (obj instanceof Map) {
        obj.set(parts[i], val);
      } else {
        obj[parts[i]] = val;
      }
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
        obj[parts[i]] = obj[parts[i]] || {};
        obj = obj[parts[i]];
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

Document.prototype.get = function(path, type, options) {
  var adhoc;
  options = options || {};
  if (type) {
    adhoc = Schema.interpretAsType(path, type, this.schema.options);
  }

  var schema = this.$__path(path) || this.schema.virtualpath(path);
  var pieces = path.split('.');
  var obj = this._doc;

  if (schema instanceof VirtualType) {
    if (schema.getters.length === 0) {
      return void 0;
    }
    return schema.applyGetters(null, this);
  }

  for (var i = 0, l = pieces.length; i < l; i++) {
    if (obj == null) {
      obj = void 0;
    } else if (obj instanceof Map) {
      obj = obj.get(pieces[i]);
    } else {
      obj = obj[pieces[i]];
    }
  }

  if (adhoc) {
    obj = adhoc.cast(obj);
  }

  if (schema) {
    obj = schema.applyGetters(obj, this);
  } else if (this.schema.nested[path] && options.virtuals) {
    // Might need to apply virtuals if this is a nested path
    return applyGetters(this, utils.clone(obj), 'virtuals', { path: path });
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
 * @param {Document} [scope] the scope to run validators with
 * @api public
 */

Document.prototype.markModified = function(path, scope) {
  this.$__.activePaths.modify(path);
  if (scope != null && !this.ownerDocument) {
    this.$__.pathsToScopes[path] = scope;
  }
};

/**
 * Clears the modified state on the specified path.
 *
 * ####Example:
 *
 *     doc.foo = 'bar';
 *     doc.unmarkModified('foo');
 *     doc.save() // changes to foo will not be persisted
 *
 * @param {String} path the path to unmark modified
 * @api public
 */

Document.prototype.unmarkModified = function(path) {
  this.$__.activePaths.init(path);
  delete this.$__.pathsToScopes[path];
};

/**
 * Don't run validation on this path or persist changes to this path.
 *
 * ####Example:
 *
 *     doc.foo = null;
 *     doc.$ignore('foo');
 *     doc.save() // changes to foo will not be persisted and validators won't be run
 *
 * @memberOf Document
 * @method $ignore
 * @param {String} path the path to ignore
 * @api public
 */

Document.prototype.$ignore = function(path) {
  this.$__.activePaths.ignore(path);
};

/**
 * Returns the list of paths that have been modified.
 *
 * @param {Object} [options]
 * @param {Boolean} [options.includeChildren=false] if true, returns children of modified paths as well. For example, if false, the list of modified paths for `doc.colors = { primary: 'blue' };` will **not** contain `colors.primary`
 * @return {Array}
 * @api public
 */

Document.prototype.modifiedPaths = function(options) {
  options = options || {};
  var directModifiedPaths = Object.keys(this.$__.activePaths.states.modify);
  var _this = this;
  return directModifiedPaths.reduce(function(list, path) {
    var parts = path.split('.');
    list = list.concat(parts.reduce(function(chains, part, i) {
      return chains.concat(parts.slice(0, i).concat(part).join('.'));
    }, []).filter(function(chain) {
      return (list.indexOf(chain) === -1);
    }));

    if (!options.includeChildren) {
      return list;
    }

    var cur = _this.get(path);
    if (cur != null && typeof cur === 'object') {
      if (cur._doc) {
        cur = cur._doc;
      }
      Object.keys(cur).
        filter(function(key) {
          return list.indexOf(path + '.' + key) === -1;
        }).
        forEach(function(key) {
          list.push(path + '.' + key);
        });
    }

    return list;
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
 *     doc.isModified()                      // true
 *     doc.isModified('documents')           // true
 *     doc.isModified('documents.0.title')   // true
 *     doc.isModified('documents otherProp') // true
 *     doc.isDirectModified('documents')     // false
 *
 * @param {String} [path] optional
 * @return {Boolean}
 * @api public
 */

Document.prototype.isModified = function(paths, modifiedPaths) {
  if (paths) {
    if (!Array.isArray(paths)) {
      paths = paths.split(' ');
    }
    var modified = modifiedPaths || this.modifiedPaths();
    var directModifiedPaths = Object.keys(this.$__.activePaths.states.modify);
    var isModifiedChild = paths.some(function(path) {
      return !!~modified.indexOf(path);
    });
    return isModifiedChild || paths.some(function(path) {
      return directModifiedPaths.some(function(mod) {
        return mod === path || path.indexOf(mod + '.') === 0;
      });
    });
  }
  return this.$__.activePaths.some('modify');
};

/**
 * Checks if a path is set to its default.
 *
 * ####Example
 *
 *     MyModel = mongoose.model('test', { name: { type: String, default: 'Val '} });
 *     var m = new MyModel();
 *     m.$isDefault('name'); // true
 *
 * @memberOf Document
 * @method $isDefault
 * @param {String} [path]
 * @return {Boolean}
 * @api public
 */

Document.prototype.$isDefault = function(path) {
  return (path in this.$__.activePaths.states.default);
};

/**
 * Getter/setter, determines whether the document was removed or not.
 *
 * ####Example:
 *     product.remove(function (err, product) {
 *       product.isDeleted(); // true
 *       product.remove(); // no-op, doesn't send anything to the db
 *
 *       product.isDeleted(false);
 *       product.isDeleted(); // false
 *       product.remove(); // will execute a remove against the db
 *     })
 *
 * @param {Boolean} [val] optional, overrides whether mongoose thinks the doc is deleted
 * @return {Boolean} whether mongoose thinks this doc is deleted.
 * @method $isDeleted
 * @memberOf Document
 * @api public
 */

Document.prototype.$isDeleted = function(val) {
  if (arguments.length === 0) {
    return !!this.$__.isDeleted;
  }

  this.$__.isDeleted = !!val;
  return this;
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

    var paths = Object.keys(this.$__.selected);
    var i = paths.length;
    var inclusive = null;
    var cur;

    if (i === 1 && paths[0] === '_id') {
      // only _id was selected.
      return this.$__.selected._id === 0;
    }

    while (i--) {
      cur = paths[i];
      if (cur === '_id') {
        continue;
      }
      if (!isDefiningProjection(this.$__.selected[cur])) {
        continue;
      }
      inclusive = !!this.$__.selected[cur];
      break;
    }

    if (inclusive === null) {
      return true;
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
        return inclusive || cur !== pathDot;
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
 * Checks if `path` was explicitly selected. If no projection, always returns
 * true.
 *
 * ####Example
 *
 *     Thing.findOne().select('nested.name').exec(function (err, doc) {
 *        doc.isDirectSelected('nested.name') // true
 *        doc.isDirectSelected('nested.otherName') // false
 *        doc.isDirectSelected('nested')  // false
 *     })
 *
 * @param {String} path
 * @return {Boolean}
 * @api public
 */

Document.prototype.isDirectSelected = function isDirectSelected(path) {
  if (this.$__.selected) {
    if (path === '_id') {
      return this.$__.selected._id !== 0;
    }

    var paths = Object.keys(this.$__.selected);
    var i = paths.length;
    var inclusive = null;
    var cur;

    if (i === 1 && paths[0] === '_id') {
      // only _id was selected.
      return this.$__.selected._id === 0;
    }

    while (i--) {
      cur = paths[i];
      if (cur === '_id') {
        continue;
      }
      if (!isDefiningProjection(this.$__.selected[cur])) {
        continue;
      }
      inclusive = !!this.$__.selected[cur];
      break;
    }

    if (inclusive === null) {
      return true;
    }

    if (path in this.$__.selected) {
      return inclusive;
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
 * @param {Function} callback optional callback called after validation completes, passing an error if one occurred
 * @return {Promise} Promise
 * @api public
 */

Document.prototype.validate = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  return utils.promiseOrCallback(callback, cb => this.$__validate(function(error) {
    cb(error);
  }));
};

/*!
 * ignore
 */

function _getPathsToValidate(doc) {
  var i;
  var len;
  var skipSchemaValidators = {};

  // only validate required fields when necessary
  var paths = Object.keys(doc.$__.activePaths.states.require).filter(function(path) {
    if (!doc.isSelected(path) && !doc.isModified(path)) {
      return false;
    }
    var p = doc.schema.path(path);
    if (typeof p.originalRequiredValue === 'function') {
      return p.originalRequiredValue.call(doc);
    }
    return true;
  });

  paths = paths.concat(Object.keys(doc.$__.activePaths.states.init));
  paths = paths.concat(Object.keys(doc.$__.activePaths.states.modify));
  paths = paths.concat(Object.keys(doc.$__.activePaths.states.default));

  if (!doc.ownerDocument) {
    var subdocs = doc.$__getAllSubdocs();
    var subdoc;
    len = subdocs.length;
    var modifiedPaths = doc.modifiedPaths();
    for (i = 0; i < len; ++i) {
      subdoc = subdocs[i];
      if (doc.isModified(subdoc.$basePath, modifiedPaths) &&
          !doc.isDirectModified(subdoc.$basePath)) {
        // Remove child paths for now, because we'll be validating the whole
        // subdoc
        paths = paths.filter(function(p) {
          return p != null && p.indexOf(subdoc.$basePath + '.') !== 0;
        });
        paths.push(subdoc.$basePath);
        skipSchemaValidators[subdoc.$basePath] = true;
      }
    }
  }

  // gh-661: if a whole array is modified, make sure to run validation on all
  // the children as well
  len = paths.length;
  for (i = 0; i < len; ++i) {
    var path = paths[i];

    var _pathType = doc.schema.path(path);
    if (!_pathType ||
        !_pathType.$isMongooseArray ||
        // To avoid potential performance issues, skip doc arrays whose children
        // are not required. `getPositionalPathType()` may be slow, so avoid
        // it unless we have a case of #6364
        (_pathType.$isMongooseDocumentArray && !get(_pathType, 'schemaOptions.required'))) {
      continue;
    }

    var val = doc.getValue(path);
    if (val) {
      var numElements = val.length;
      for (var j = 0; j < numElements; ++j) {
        paths.push(path + '.' + j);
      }
    }
  }

  var flattenOptions = { skipArrays: true };
  len = paths.length;
  for (i = 0; i < len; ++i) {
    var pathToCheck = paths[i];
    if (doc.schema.nested[pathToCheck]) {
      var _v = doc.getValue(pathToCheck);
      if (isMongooseObject(_v)) {
        _v = _v.toObject({ transform: false });
      }
      var flat = flatten(_v, '', flattenOptions);
      var _subpaths = Object.keys(flat).map(function(p) {
        return pathToCheck + '.' + p;
      });
      paths = paths.concat(_subpaths);
    }
  }

  len = paths.length;
  for (i = 0; i < len; ++i) {
    const path = paths[i];
    const _pathType = doc.schema.path(path);
    if (!_pathType || !_pathType.$isSchemaMap) {
      continue;
    }

    const val = doc.getValue(path);
    if (val == null) {
      continue;
    }
    for (let key of val.keys()) {
      paths.push(path + '.' + key);
    }
  }

  return [paths, skipSchemaValidators];
}

/*!
 * ignore
 */

Document.prototype.$__validate = function(callback) {
  const _this = this;
  const _complete = function() {
    var err = _this.$__.validationError;
    _this.$__.validationError = undefined;
    _this.emit('validate', _this);
    _this.constructor.emit('validate', _this);
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
  const pathDetails = _getPathsToValidate(this);
  const paths = pathDetails[0];
  const skipSchemaValidators = pathDetails[1];

  if (paths.length === 0) {
    return process.nextTick(function() {
      const error = _complete();
      if (error) {
        return _this.schema.s.hooks.execPost('validate:error', _this, [ _this], { error: error }, function(error) {
          callback(error);
        });
      }
      callback(null, _this);
    });
  }

  const validated = {};
  let total = 0;

  var complete = function() {
    const error = _complete();
    if (error) {
      return _this.schema.s.hooks.execPost('validate:error', _this, [ _this], { error: error }, function(error) {
        callback(error);
      });
    }
    callback(null, _this);
  };

  var validatePath = function(path) {
    if (path == null || validated[path]) {
      return;
    }

    validated[path] = true;
    total++;

    process.nextTick(function() {
      const p = _this.schema.path(path);

      if (!p) {
        return --total || complete();
      }

      // If user marked as invalid or there was a cast error, don't validate
      if (!_this.$isValid(path)) {
        --total || complete();
        return;
      }

      const val = _this.getValue(path);
      const scope = path in _this.$__.pathsToScopes ?
        _this.$__.pathsToScopes[path] :
        _this;

      p.doValidate(val, function(err) {
        if (err) {
          _this.invalidate(path, err, undefined, true);
        }
        --total || complete();
      }, scope, { skipSchemaValidators: skipSchemaValidators[path] });
    });
  };

  const numPaths = paths.length;
  for (let i = 0; i < numPaths; ++i) {
    validatePath(paths[i]);
  }
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
  const _this = this;

  if (typeof pathsToValidate === 'string') {
    pathsToValidate = pathsToValidate.split(' ');
  }

  // only validate required fields when necessary
  const pathDetails = _getPathsToValidate(this);
  let paths = pathDetails[0];
  const skipSchemaValidators = pathDetails[1];

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
    var err = p.doValidateSync(val, _this, {
      skipSchemaValidators: skipSchemaValidators[path]
    });
    if (err) {
      _this.invalidate(path, err, undefined, true);
    }
  });

  var err = _this.$__.validationError;
  _this.$__.validationError = undefined;
  _this.emit('validate', _this);
  _this.constructor.emit('validate', _this);

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
 * @param {String} [kind] optional `kind` property for the error
 * @return {ValidationError} the current ValidationError, with all currently invalidated paths
 * @api public
 */

Document.prototype.invalidate = function(path, err, val, kind) {
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
      type: kind || 'user defined',
      value: val
    });
  }

  if (this.$__.validationError === err) {
    return this.$__.validationError;
  }

  this.$__.validationError.addError(path, err);
  return this.$__.validationError;
};

/**
 * Marks a path as valid, removing existing validation errors.
 *
 * @param {String} path the field to mark as valid
 * @api public
 * @memberOf Document
 * @method $markValid
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
 * Saves this document.
 *
 * ####Example:
 *
 *     product.sold = Date.now();
 *     product.save(function (err, product) {
 *       if (err) ..
 *     })
 *
 * The callback will receive three parameters
 *
 * 1. `err` if an error occurred
 * 2. `product` which is the saved `product`
 *
 * As an extra measure of flow control, save will return a Promise.
 * ####Example:
 *     product.save().then(function(product) {
 *        ...
 *     });
 *
 * @param {Object} [options] options optional options
 * @param {Object} [options.safe] overrides [schema's safe option](http://mongoosejs.com//docs/guide.html#safe)
 * @param {Boolean} [options.validateBeforeSave] set to false to save without validating.
 * @param {Function} [fn] optional callback
 * @method save
 * @memberOf Document
 * @return {Promise} Promise
 * @api public
 * @see middleware http://mongoosejs.com/docs/middleware.html
 */

/**
 * Checks if a path is invalid
 *
 * @param {String} path the field to check
 * @method $isValid
 * @memberOf Document
 * @api private
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

  this.$__.activePaths.
    map('init', 'modify', function(i) {
      return _this.getValue(i);
    }).
    filter(function(val) {
      return val && val.$isSingleNested;
    }).
    forEach(function(doc) {
      doc.$__reset();
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
    if (path === '_id' || _this.getValue(path) == null) {
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

/**
 * Assigns/compiles `schema` into this documents prototype.
 *
 * @param {Schema} schema
 * @api private
 * @method $__setSchema
 * @memberOf Document
 */

Document.prototype.$__setSchema = function(schema) {
  schema.plugin(idGetter, { deduplicate: true });
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

  function docReducer(doc, seed, path) {
    var val = doc[path];

    if (val instanceof Embedded) {
      seed.push(val);
    }
    if (val && val.$isSingleNested) {
      seed = Object.keys(val._doc).reduce(function(seed, path) {
        return docReducer(val._doc, seed, path);
      }, seed);
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
        seed = Object.keys(doc._doc).reduce(function(seed, path) {
          return docReducer(doc._doc, seed, path);
        }, seed);
      });
    } else if (val instanceof Document && val.$__isNested) {
      if (val) {
        seed = Object.keys(val).reduce(function(seed, path) {
          return docReducer(val, seed, path);
        }, seed);
      }
    }
    return seed;
  }

  var _this = this;
  var subDocs = Object.keys(this._doc).reduce(function(seed, path) {
    return docReducer(_this, seed, path);
  }, []);

  return subDocs;
};

/*!
 * Runs queued functions
 */

function applyQueue(doc) {
  var q = doc.schema && doc.schema.callQueue;
  if (!q.length) {
    return;
  }
  var pair;

  for (var i = 0; i < q.length; ++i) {
    pair = q[i];
    if (pair[0] !== 'pre' && pair[0] !== 'post' && pair[0] !== 'on') {
      doc[pair[0]].apply(doc, pair[1]);
    }
  }
}

/*!
 * ignore
 */

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
  let defaultOptions = {
    transform: true,
    flattenDecimals: true
  };

  // merge base default options with Schema's set default options if available.
  // `clone` is necessary here because `utils.options` directly modifies the second input.
  if (json && this.schema.options.toJSON) {
    defaultOptions = utils.options(defaultOptions, clone(this.schema.options.toJSON));
  } else if (this.schema.options.toObject) {
    defaultOptions = utils.options(defaultOptions, clone(this.schema.options.toObject));
  }

  // If options do not exist or is not an object, set it to empty object
  options = options && utils.getFunctionName(options.constructor) === 'Object' ?
    clone(options) :
    {};

  let _minimize;
  if (options.minimize != null) {
    _minimize = options.minimize;
  } else if (defaultOptions.minimize != null) {
    _minimize = defaultOptions.minimize;
  } else {
    _minimize = this.schema.options.minimize;
  }

  // The original options that will be passed to `clone()`. Important because
  // `clone()` will recursively call `$toObject()` on embedded docs, so we
  // need the original options the user passed in, plus `_isNested` and
  // `_parentOptions` for checking whether we need to depopulate.
  const cloneOptions = Object.assign(utils.clone(options), {
    _isNested: true,
    json: json,
    minimize: _minimize
  });

  const depopulate = options.depopulate ||
    get(options, '_parentOptions.depopulate', false);
  // _isNested will only be true if this is not the top level document, we
  // should never depopulate
  if (depopulate && options._isNested && this.$__.wasPopulated) {
    // populated paths that we set to a document
    return clone(this._id, cloneOptions);
  }

  // merge default options with input options.
  options = utils.options(defaultOptions, options);
  options._isNested = true;
  options.json = json;
  options.minimize = _minimize;

  cloneOptions._parentOptions = options;

  // remember the root transform function
  // to save it from being overwritten by sub-transform functions
  var originalTransform = options.transform;

  var ret = clone(this._doc, cloneOptions) || {};

  if (options.getters) {
    applyGetters(this, ret, 'paths', cloneOptions);
    // applyGetters for paths will add nested empty objects;
    // if minimize is set, we need to remove them.
    if (options.minimize) {
      ret = minimize(ret) || {};
    }
  }

  if (options.virtuals || options.getters && options.virtuals !== false) {
    applyGetters(this, ret, 'virtuals', cloneOptions);
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
 *       return ret;
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
 * If you want to skip transformations, use `transform: false`:
 *
 *     if (!schema.options.toObject) schema.options.toObject = {};
 *     schema.options.toObject.hide = '_id';
 *     schema.options.toObject.transform = function (doc, ret, options) {
 *       if (options.hide) {
 *         options.hide.split(' ').forEach(function (prop) {
 *           delete ret[prop];
 *         });
 *       }
 *       return ret;
 *     }
 *
 *     var doc = new Doc({ _id: 'anId', secret: 47, name: 'Wreck-it Ralph' });
 *     doc.toObject();                                        // { secret: 47, name: 'Wreck-it Ralph' }
 *     doc.toObject({ hide: 'secret _id', transform: false });// { _id: 'anId', secret: 47, name: 'Wreck-it Ralph' }
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
 * @memberOf Document
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

    if (utils.isObject(val) && !Buffer.isBuffer(val)) {
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
  var schema = self.schema;
  var paths = Object.keys(schema[type]);
  var i = paths.length;
  var numPaths = i;
  var path;
  var assignPath;
  var cur = self._doc;
  var v;

  if (!cur) {
    return json;
  }

  if (type === 'virtuals') {
    options = options || {};
    for (i = 0; i < numPaths; ++i) {
      path = paths[i];
      // We may be applying virtuals to a nested object, for example if calling
      // `doc.nestedProp.toJSON()`. If so, the path we assign to, `assignPath`,
      // will be a trailing substring of the `path`.
      assignPath = path;
      if (options.path != null) {
        if (!path.startsWith(options.path + '.')) {
          continue;
        }
        assignPath = path.substr(options.path.length + 1);
      }
      parts = assignPath.split('.');
      v = clone(self.get(path), options);
      if (v === void 0) {
        continue;
      }
      plen = parts.length;
      cur = json;
      for (var j = 0; j < plen - 1; ++j) {
        cur[parts[j]] = cur[parts[j]] || {};
        cur = cur[parts[j]];
      }
      cur[parts[plen - 1]] = v;
    }

    return json;
  }

  while (i--) {
    path = paths[i];

    var parts = path.split('.');
    var plen = parts.length;
    var last = plen - 1;
    var branch = json;
    var part;
    cur = self._doc;

    for (var ii = 0; ii < plen; ++ii) {
      part = parts[ii];
      v = cur[part];
      if (ii === last) {
        branch[part] = clone(self.get(path), options);
      } else if (v == null) {
        if (part in cur) {
          branch[part] = v;
        }
        break;
      } else {
        branch = branch[part] || (branch[part] = {});
      }
      cur = v;
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
 * @memberOf Document
 */

Document.prototype.toJSON = function(options) {
  return this.$toObject(options, true);
};

/**
 * Helper for console.log
 *
 * @api public
 * @method inspect
 * @memberOf Document
 */

Document.prototype.inspect = function(options) {
  var isPOJO = options &&
    utils.getFunctionName(options.constructor) === 'Object';
  var opts;
  if (isPOJO) {
    opts = options;
    opts.minimize = false;
  }
  return this.toObject(opts);
};

/**
 * Helper for console.log
 *
 * @api public
 * @method toString
 * @memberOf Document
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
 * @memberOf Document
 */

Document.prototype.equals = function(doc) {
  if (!doc) {
    return false;
  }

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
 * @memberOf Document
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
    var topLevelModel = this.constructor;
    if (this.$__isNested) {
      topLevelModel = this.$__.scope.constructor;
      var nestedPath = this.$__.nestedPath;
      paths.forEach(function(populateOptions) {
        populateOptions.path = nestedPath + '.' + populateOptions.path;
      });
    }
    topLevelModel.populate(this, paths, fn);
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
 * @see Document.populate #document_Document-populate
 * @api public
 * @return {Promise} promise that resolves to the document when population is done
 * @memberOf Document
 */

Document.prototype.execPopulate = function() {
  return utils.promiseOrCallback(null, cb => {
    this.populate(cb);
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
 * @memberOf Document
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
 * @return {Document} this
 * @see Document.populate #document_Document-populate
 * @api public
 * @memberOf Document
 */

Document.prototype.depopulate = function(path) {
  if (typeof path === 'string') {
    path = path.split(' ');
  }
  var i;
  var populatedIds;

  if (arguments.length === 0) {
    // Depopulate all
    var keys = Object.keys(this.$__.populated);

    for (i = 0; i < keys.length; i++) {
      populatedIds = this.populated(keys[i]);
      if (!populatedIds) {
        continue;
      }
      delete this.$__.populated[keys[i]];
      this.$set(keys[i], populatedIds);
    }
    return this;
  }

  for (i = 0; i < path.length; i++) {
    populatedIds = this.populated(path[i]);
    if (!populatedIds) {
      continue;
    }
    delete this.$__.populated[path[i]];
    this.$set(path[i], populatedIds);
  }
  return this;
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
