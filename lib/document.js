'use strict';

/*!
 * Module dependencies.
 */

const EventEmitter = require('events').EventEmitter;
const InternalCache = require('./internal');
const MongooseError = require('./error/index');
const MixedSchema = require('./schema/mixed');
const ObjectExpectedError = require('./error/objectExpected');
const ObjectParameterError = require('./error/objectParameter');
const ParallelValidateError = require('./error/parallelValidate');
const Schema = require('./schema');
const StrictModeError = require('./error/strict');
const ValidationError = require('./error/validation');
const ValidatorError = require('./error/validator');
const VirtualType = require('./virtualtype');
const $__hasIncludedChildren = require('./helpers/projection/hasIncludedChildren');
const promiseOrCallback = require('./helpers/promiseOrCallback');
const cleanModifiedSubpaths = require('./helpers/document/cleanModifiedSubpaths');
const compile = require('./helpers/document/compile').compile;
const defineKey = require('./helpers/document/compile').defineKey;
const flatten = require('./helpers/common').flatten;
const flattenObjectWithDottedPaths = require('./helpers/path/flattenObjectWithDottedPaths');
const get = require('./helpers/get');
const getEmbeddedDiscriminatorPath = require('./helpers/document/getEmbeddedDiscriminatorPath');
const getKeysInSchemaOrder = require('./helpers/schema/getKeysInSchemaOrder');
const handleSpreadDoc = require('./helpers/document/handleSpreadDoc');
const immediate = require('./helpers/immediate');
const isDefiningProjection = require('./helpers/projection/isDefiningProjection');
const isExclusive = require('./helpers/projection/isExclusive');
const inspect = require('util').inspect;
const internalToObjectOptions = require('./options').internalToObjectOptions;
const markArraySubdocsPopulated = require('./helpers/populate/markArraySubdocsPopulated');
const mpath = require('mpath');
const queryhelpers = require('./queryhelpers');
const utils = require('./utils');
const isPromise = require('./helpers/isPromise');

const clone = utils.clone;
const deepEqual = utils.deepEqual;
const isMongooseObject = utils.isMongooseObject;

const arrayAtomicsBackupSymbol = require('./helpers/symbols').arrayAtomicsBackupSymbol;
const arrayAtomicsSymbol = require('./helpers/symbols').arrayAtomicsSymbol;
const documentArrayParent = require('./helpers/symbols').documentArrayParent;
const documentIsModified = require('./helpers/symbols').documentIsModified;
const documentModifiedPaths = require('./helpers/symbols').documentModifiedPaths;
const documentSchemaSymbol = require('./helpers/symbols').documentSchemaSymbol;
const getSymbol = require('./helpers/symbols').getSymbol;
const populateModelSymbol = require('./helpers/symbols').populateModelSymbol;
const scopeSymbol = require('./helpers/symbols').scopeSymbol;
const schemaMixedSymbol = require('./schema/symbols').schemaMixedSymbol;
const parentPaths = require('./helpers/path/parentPaths');
let DocumentArray;
let MongooseArray;
let Embedded;

const specialProperties = utils.specialProperties;

/**
 * The core Mongoose document constructor. You should not call this directly,
 * the Mongoose [Model constructor](./api.html#Model) calls this for you.
 *
 * @param {Object} obj the values to set
 * @param {Object} [fields] optional object containing the fields which were selected in the query returning this document and any populated paths data
 * @param {Object} [options] various configuration options for the document
 * @param {Boolean} [options.defaults=true] if `false`, skip applying default values to this document.
 * @inherits NodeJS EventEmitter https://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `init`: Emitted on a document after it has been retrieved from the db and fully hydrated by Mongoose.
 * @event `save`: Emitted when the document is successfully saved
 * @api private
 */

function Document(obj, fields, skipId, options) {
  if (typeof skipId === 'object' && skipId != null) {
    options = skipId;
    skipId = options.skipId;
  }
  options = Object.assign({}, options);

  // Support `browserDocument.js` syntax
  if (this.$__schema == null) {
    const _schema = utils.isObject(fields) && !fields.instanceOfSchema ?
      new Schema(fields) :
      fields;
    this.$__setSchema(_schema);
    fields = skipId;
    skipId = options;
    options = arguments[4] || {};
  }

  this.$__ = new InternalCache();
  this.$isNew = 'isNew' in options ? options.isNew : true;

  if ('priorDoc' in options) {
    this.$__.priorDoc = options.priorDoc;
  }
  if (skipId) {
    this.$__.skipId = skipId;
  }

  if (obj != null && typeof obj !== 'object') {
    throw new ObjectParameterError(obj, 'obj', 'Document');
  }

  let defaults = true;
  if (options.defaults !== undefined) {
    this.$__.defaults = options.defaults;
    defaults = options.defaults;
  }

  const schema = this.$__schema;

  if (typeof fields === 'boolean' || fields === 'throw') {
    this.$__.strictMode = fields;
    fields = undefined;
  } else {
    this.$__.strictMode = schema.options.strict;
    if (fields !== undefined) {
      this.$__.selected = fields;
    }
  }

  const requiredPaths = schema.requiredPaths(true);
  for (const path of requiredPaths) {
    this.$__.activePaths.require(path);
  }

  let exclude = null;

  // determine if this doc is a result of a query with
  // excluded fields
  if (utils.isPOJO(fields)) {
    exclude = isExclusive(fields);

    this.$__.fields = fields;
    this.$__.exclude = exclude;
  }

  const hasIncludedChildren = exclude === false && fields ?
    $__hasIncludedChildren(fields) :
    {};

  if (this._doc == null) {
    this.$__buildDoc(obj, fields, skipId, exclude, hasIncludedChildren, false);

    // By default, defaults get applied **before** setting initial values
    // Re: gh-6155
    if (defaults) {
      $__applyDefaults(this, fields, exclude, hasIncludedChildren, true, {
        isNew: this.$isNew
      });
    }
  }
  if (obj) {
    // Skip set hooks
    if (this.$__original_set) {
      this.$__original_set(obj, undefined, true);
    } else {
      this.$set(obj, undefined, true);
    }

    if (obj instanceof Document) {
      this.$isNew = obj.$isNew;
    }
  }

  // Function defaults get applied **after** setting initial values so they
  // see the full doc rather than an empty one, unless they opt out.
  // Re: gh-3781, gh-6155
  if (options.willInit && defaults) {
    if (options.skipDefaults) {
      this.$__.skipDefaults = options.skipDefaults;
    }
  } else if (defaults) {
    $__applyDefaults(this, fields, exclude, hasIncludedChildren, false, options.skipDefaults, {
      isNew: this.$isNew
    });
  }

  this.$__._id = this._id;

  if (!this.$__.strictMode && obj) {
    const _this = this;
    const keys = Object.keys(this._doc);

    keys.forEach(function(key) {
      // Avoid methods, virtuals, existing fields, and `$` keys. The latter is to avoid overwriting
      // Mongoose internals.
      if (!(key in schema.tree) && !(key in schema.methods) && !(key in schema.virtuals) && !key.startsWith('$')) {
        defineKey({ prop: key, subprops: null, prototype: _this });
      }
    });
  }

  applyQueue(this);
}

Object.defineProperty(Document.prototype, 'isNew', {
  get: function() {
    return this.$isNew;
  },
  set: function(value) {
    this.$isNew = value;
  }
});

Object.defineProperty(Document.prototype, 'errors', {
  get: function() {
    return this.$errors;
  },
  set: function(value) {
    this.$errors = value;
  }
});
/*!
 * Document exposes the NodeJS event emitter API, so you can use
 * `on`, `once`, etc.
 */
utils.each(
  ['on', 'once', 'emit', 'listeners', 'removeListener', 'setMaxListeners',
    'removeAllListeners', 'addListener'],
  function(emitterFn) {
    Document.prototype[emitterFn] = function() {
      // Delay creating emitter until necessary because emitters take up a lot of memory,
      // especially for subdocuments.
      if (!this.$__.emitter) {
        if (emitterFn === 'emit') {
          return;
        }
        this.$__.emitter = new EventEmitter();
        this.$__.emitter.setMaxListeners(0);
      }
      return this.$__.emitter[emitterFn].apply(this.$__.emitter, arguments);
    };
    Document.prototype[`$${emitterFn}`] = Document.prototype[emitterFn];
  });

Document.prototype.constructor = Document;

for (const i in EventEmitter.prototype) {
  Document[i] = EventEmitter.prototype[i];
}

/**
 * The document's internal schema.
 *
 * @api private
 * @property schema
 * @memberOf Document
 * @instance
 */

Document.prototype.$__schema;

/**
 * The document's schema.
 *
 * @api public
 * @property schema
 * @memberOf Document
 * @instance
 */

Document.prototype.schema;

/**
 * Empty object that you can use for storing properties on the document. This
 * is handy for passing data to middleware without conflicting with Mongoose
 * internals.
 *
 * ####Example:
 *
 *     schema.pre('save', function() {
 *       // Mongoose will set `isNew` to `false` if `save()` succeeds
 *       this.$locals.wasNew = this.isNew;
 *     });
 *
 *     schema.post('save', function() {
 *       // Prints true if `isNew` was set before `save()`
 *       console.log(this.$locals.wasNew);
 *     });
 *
 * @api public
 * @property $locals
 * @memberOf Document
 * @instance
 */

Object.defineProperty(Document.prototype, '$locals', {
  configurable: false,
  enumerable: false,
  get: function() {
    if (this.$__.locals == null) {
      this.$__.locals = {};
    }
    return this.$__.locals;
  },
  set: function(v) {
    this.$__.locals = v;
  }
});


/**
 * Boolean flag specifying if the document is new.
 *
 * @api public
 * @property $isNew
 * @memberOf Document
 * @instance
 */

Document.prototype.$isNew;

/**
 * Boolean flag specifying if the document is new.
 *
 * @api public
 * @property isNew
 * @memberOf Document
 * @instance
 */

Document.prototype.isNew;

/**
 * Set this property to add additional query filters when Mongoose saves this document and `isNew` is false.
 *
 * ####Example:
 *
 *     // Make sure `save()` never updates a soft deleted document.
 *     schema.pre('save', function() {
 *       this.$where = { isDeleted: false };
 *     });
 *
 * @api public
 * @property $where
 * @memberOf Document
 * @instance
 */

Object.defineProperty(Document.prototype, '$where', {
  configurable: false,
  enumerable: false,
  writable: true
});

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
 * @instance
 */

Document.prototype.id;

/**
 * Hash containing current validation $errors.
 *
 * @api public
 * @property $errors
 * @memberOf Document
 * @instance
 */

Document.prototype.$errors;

/**
 * Hash containing current validation errors.
 *
 * @api public
 * @property errors
 * @memberOf Document
 * @instance
 */

Document.prototype.errors;

/**
 * A string containing the current operation that Mongoose is executing
 * on this document. May be `null`, `'save'`, `'validate'`, or `'remove'`.
 *
 * ####Example:
 *
 *     const doc = new Model({ name: 'test' });
 *     doc.$op; // null
 *
 *     const promise = doc.save();
 *     doc.$op; // 'save'
 *
 *     await promise;
 *     doc.$op; // null
 *
 * @api public
 * @property $op
 * @memberOf Document
 * @instance
 */

Object.defineProperty(Document.prototype, '$op', {
  get: function() {
    return this.$__.op || null;
  },
  set: function(value) {
    this.$__.op = value;
  }
});

/*!
 * ignore
 */

function $__applyDefaults(doc, fields, exclude, hasIncludedChildren, isBeforeSetters, pathsToSkip) {
  const paths = Object.keys(doc.$__schema.paths);
  const plen = paths.length;

  for (let i = 0; i < plen; ++i) {
    let def;
    let curPath = '';
    const p = paths[i];

    if (p === '_id' && doc.$__.skipId) {
      continue;
    }

    const type = doc.$__schema.paths[p];
    const path = type.splitPath();
    const len = path.length;
    let included = false;
    let doc_ = doc._doc;
    for (let j = 0; j < len; ++j) {
      if (doc_ == null) {
        break;
      }

      const piece = path[j];
      curPath += (!curPath.length ? '' : '.') + piece;

      if (exclude === true) {
        if (curPath in fields) {
          break;
        }
      } else if (exclude === false && fields && !included) {
        const hasSubpaths = type.$isSingleNested || type.$isMongooseDocumentArray;
        if (curPath in fields || (hasSubpaths && hasIncludedChildren[curPath])) {
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

            try {
              def = type.getDefault(doc, false);
            } catch (err) {
              doc.invalidate(p, err);
              break;
            }

            if (typeof def !== 'undefined') {
              doc_[piece] = def;
              doc.$__.activePaths.default(p);
            }
          } else if (included) {
            // selected field
            try {
              def = type.getDefault(doc, false);
            } catch (err) {
              doc.invalidate(p, err);
              break;
            }

            if (typeof def !== 'undefined') {
              doc_[piece] = def;
              doc.$__.activePaths.default(p);
            }
          }
        } else {
          try {
            def = type.getDefault(doc, false);
          } catch (err) {
            doc.invalidate(p, err);
            break;
          }

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

/*!
 * ignore
 */

function $applyDefaultsToNested(val, path, doc) {
  if (val == null) {
    return;
  }

  flattenObjectWithDottedPaths(val);

  const paths = Object.keys(doc.$__schema.paths);
  const plen = paths.length;

  const pathPieces = path.indexOf('.') === -1 ? [path] : path.split('.');

  for (let i = 0; i < plen; ++i) {
    let curPath = '';
    const p = paths[i];

    if (!p.startsWith(path + '.')) {
      continue;
    }

    const type = doc.$__schema.paths[p];
    const pieces = type.splitPath().slice(pathPieces.length);
    const len = pieces.length;

    if (type.defaultValue === void 0) {
      continue;
    }

    let cur = val;

    for (let j = 0; j < len; ++j) {
      if (cur == null) {
        break;
      }

      const piece = pieces[j];

      if (j === len - 1) {
        if (cur[piece] !== void 0) {
          break;
        }

        try {
          const def = type.getDefault(doc, false);
          if (def !== void 0) {
            cur[piece] = def;
          }
        } catch (err) {
          doc.invalidate(path + '.' + curPath, err);
          break;
        }

        break;
      }

      curPath += (!curPath.length ? '' : '.') + piece;

      cur[piece] = cur[piece] || {};
      cur = cur[piece];
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
 * @instance
 */

Document.prototype.$__buildDoc = function(obj, fields, skipId, exclude, hasIncludedChildren) {
  const doc = {};

  const paths = Object.keys(this.$__schema.paths).
    // Don't build up any paths that are underneath a map, we don't know
    // what the keys will be
    filter(p => !p.includes('$*'));
  const plen = paths.length;
  let ii = 0;

  for (; ii < plen; ++ii) {
    const p = paths[ii];

    if (p === '_id') {
      if (skipId) {
        continue;
      }
      if (obj && '_id' in obj) {
        continue;
      }
    }

    const path = this.$__schema.paths[p].splitPath();
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
 * Called internally after a document is returned from mongodb. Normally,
 * you do **not** need to call this function on your own.
 *
 * This function triggers `init` [middleware](/docs/middleware.html).
 * Note that `init` hooks are [synchronous](/docs/middleware.html#synchronous).
 *
 * @param {Object} doc document returned by mongo
 * @api public
 * @memberOf Document
 * @instance
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

Document.prototype.$init = function() {
  return this.constructor.prototype.init.apply(this, arguments);
};

Document.prototype.$__init = function(doc, opts) {
  this.$isNew = false;
  opts = opts || {};

  // handle docs with populated paths
  // If doc._id is not null or undefined
  if (doc._id != null && opts.populated && opts.populated.length) {
    const id = String(doc._id);
    for (const item of opts.populated) {
      if (item.isVirtual) {
        this.$populated(item.path, utils.getValue(item.path, doc), item);
      } else {
        this.$populated(item.path, item._docs[id], item);
      }

      if (item._childDocs == null) {
        continue;
      }
      for (const child of item._childDocs) {
        if (child == null || child.$__ == null) {
          continue;
        }
        child.$__.parent = this;
      }
      item._childDocs = [];
    }
  }

  init(this, doc, this._doc, opts);

  markArraySubdocsPopulated(this, opts.populated);

  this.$emit('init', this);
  this.constructor.emit('init', this);

  this.$__._id = this._id;

  const hasIncludedChildren = this.$__.exclude === false && this.$__.fields ?
    $__hasIncludedChildren(this.$__.fields) :
    {};
  $__applyDefaults(this, this.$__.fields, this.$__.exclude, hasIncludedChildren, false, this.$__.skipDefaults);

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

function init(self, obj, doc, opts, prefix) {
  prefix = prefix || '';

  const keys = Object.keys(obj);
  const len = keys.length;
  let schemaType;
  let path;
  let i;
  let index = 0;
  const strict = self.$__.strictMode;
  const docSchema = self.$__schema;

  while (index < len) {
    _init(index++);
  }

  function _init(index) {
    i = keys[index];
    path = prefix + i;
    schemaType = docSchema.path(path);

    // Should still work if not a model-level discriminator, but should not be
    // necessary. This is *only* to catch the case where we queried using the
    // base model and the discriminated model has a projection
    if (docSchema.$isRootDiscriminator && !self.$__isSelected(path)) {
      return;
    }

    if (!schemaType && utils.isPOJO(obj[i])) {
      // assume nested object
      if (!doc[i]) {
        doc[i] = {};
        if (!strict && !(i in docSchema.tree) && !(i in docSchema.methods) && !(i in docSchema.virtuals)) {
          self[i] = doc[i];
        }
      }
      init(self, obj[i], doc[i], opts, path + '.');
    } else if (!schemaType) {
      doc[i] = obj[i];
      if (!strict) {
        self[i] = obj[i];
      }
    } else {
      // Retain order when overwriting defaults
      if (doc.hasOwnProperty(i) && obj[i] !== void 0) {
        delete doc[i];
      }
      if (obj[i] === null) {
        doc[i] = schemaType._castNullish(null);
      } else if (obj[i] !== undefined) {
        const wasPopulated = obj[i].$__ == null ? null : obj[i].$__.wasPopulated;

        if (schemaType && !wasPopulated) {
          try {
            doc[i] = schemaType.cast(obj[i], self, true);
          } catch (e) {
            self.invalidate(e.path, new ValidatorError({
              path: e.path,
              message: e.message,
              type: 'cast',
              value: e.value,
              reason: e
            }));
          }
        } else {
          doc[i] = obj[i];
        }
      }
      // mark as hydrated
      if (!self.$isModified(path)) {
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
 * @instance
 */

Document.prototype.update = function update() {
  const args = [...arguments];
  args.unshift({ _id: this._id });
  const query = this.constructor.update.apply(this.constructor, args);

  if (this.$session() != null) {
    if (!('session' in query.options)) {
      query.options.session = this.$session();
    }
  }

  return query;
};

/**
 * Sends an updateOne command with this document `_id` as the query selector.
 *
 * ####Example:
 *
 *     weirdCar.updateOne({$inc: {wheels:1}}, { w: 1 }, callback);
 *
 * ####Valid options:
 *
 *  - same as in [Model.updateOne](#model_Model.updateOne)
 *
 * @see Model.updateOne #model_Model.updateOne
 * @param {Object} doc
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Object} [options.lean] if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](/docs/api.html#query_Query-lean) and the [Mongoose lean tutorial](/docs/tutorials/lean.html).
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.timestamps=null] If set to `false` and [schema-level timestamps](/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Note that this allows you to overwrite timestamps. Does nothing if schema-level timestamps are not set.
 * @param {Function} callback
 * @return {Query}
 * @api public
 * @memberOf Document
 * @instance
 */

Document.prototype.updateOne = function updateOne(doc, options, callback) {
  const query = this.constructor.updateOne({ _id: this._id }, doc, options);
  query.pre(cb => {
    this.constructor._middleware.execPre('updateOne', this, [this], cb);
  });
  query.post(cb => {
    this.constructor._middleware.execPost('updateOne', this, [this], {}, cb);
  });

  if (this.$session() != null) {
    if (!('session' in query.options)) {
      query.options.session = this.$session();
    }
  }

  if (callback != null) {
    return query.exec(callback);
  }

  return query;
};

/**
 * Sends a replaceOne command with this document `_id` as the query selector.
 *
 * ####Valid options:
 *
 *  - same as in [Model.replaceOne](https://mongoosejs.com/docs/api/model.html#model_Model.replaceOne)
 *
 * @see Model.replaceOne #model_Model.replaceOne
 * @param {Object} doc
 * @param {Object} options
 * @param {Function} callback
 * @return {Query}
 * @api public
 * @memberOf Document
 * @instance
 */

Document.prototype.replaceOne = function replaceOne() {
  const args = [...arguments];
  args.unshift({ _id: this._id });
  return this.constructor.replaceOne.apply(this.constructor, args);
};

/**
 * Getter/setter around the session associated with this document. Used to
 * automatically set `session` if you `save()` a doc that you got from a
 * query with an associated session.
 *
 * ####Example:
 *
 *     const session = MyModel.startSession();
 *     const doc = await MyModel.findOne().session(session);
 *     doc.$session() === session; // true
 *     doc.$session(null);
 *     doc.$session() === null; // true
 *
 * If this is a top-level document, setting the session propagates to all child
 * docs.
 *
 * @param {ClientSession} [session] overwrite the current session
 * @return {ClientSession}
 * @method $session
 * @api public
 * @memberOf Document
 */

Document.prototype.$session = function $session(session) {
  if (arguments.length === 0) {
    if (this.$__.session != null && this.$__.session.hasEnded) {
      this.$__.session = null;
      return null;
    }
    return this.$__.session;
  }

  if (session != null && session.hasEnded) {
    throw new MongooseError('Cannot set a document\'s session to a session that has ended. Make sure you haven\'t ' +
      'called `endSession()` on the session you are passing to `$session()`.');
  }

  if (session == null && this.$__.session == null) {
    return;
  }

  this.$__.session = session;

  if (!this.$isSubdocument) {
    const subdocs = this.$getAllSubdocs();
    for (const child of subdocs) {
      child.$session(session);
    }
  }

  return session;
};

/**
 * Overwrite all values in this document with the values of `obj`, except
 * for immutable properties. Behaves similarly to `set()`, except for it
 * unsets all properties that aren't in `obj`.
 *
 * @param {Object} obj the object to overwrite this document with
 * @method overwrite
 * @name overwrite
 * @memberOf Document
 * @instance
 * @api public
 */

Document.prototype.overwrite = function overwrite(obj) {
  const keys = Array.from(new Set(Object.keys(this._doc).concat(Object.keys(obj))));

  for (const key of keys) {
    if (key === '_id') {
      continue;
    }
    // Explicitly skip version key
    if (this.$__schema.options.versionKey && key === this.$__schema.options.versionKey) {
      continue;
    }
    if (this.$__schema.options.discriminatorKey && key === this.$__schema.options.discriminatorKey) {
      continue;
    }
    this.$set(key, obj[key]);
  }

  return this;
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
 * @instance
 * @api public
 */

Document.prototype.$set = function $set(path, val, type, options) {
  if (utils.isPOJO(type)) {
    options = type;
    type = undefined;
  }

  options = options || {};
  const merge = options.merge;
  const adhoc = type && type !== true;
  const constructing = type === true;
  const typeKey = this.$__schema.options.typeKey;
  let adhocs;
  let keys;
  let i = 0;
  let pathtype;
  let key;
  let prefix;

  const strict = 'strict' in options
    ? options.strict
    : this.$__.strictMode;

  if (adhoc) {
    adhocs = this.$__.adhocPaths || (this.$__.adhocPaths = {});
    adhocs[path] = this.$__schema.interpretAsType(path, type, this.$__schema.options);
  }

  if (path == null) {
    [path, val] = [val, path];
  } else if (typeof path !== 'string') {
    // new Document({ key: val })
    if (path instanceof Document) {
      if (path.$__isNested) {
        path = path.toObject();
      } else {
        path = path._doc;
      }
    }
    if (path == null) {
      [path, val] = [val, path];
    }

    prefix = val ? val + '.' : '';
    keys = getKeysInSchemaOrder(this.$__schema, path);

    const len = keys.length;

    // `_skipMinimizeTopLevel` is because we may have deleted the top-level
    // nested key to ensure key order.
    const _skipMinimizeTopLevel = options._skipMinimizeTopLevel || false;
    if (len === 0 && _skipMinimizeTopLevel) {
      delete options._skipMinimizeTopLevel;
      if (val) {
        this.$set(val, {});
      }
      return this;
    }

    for (let i = 0; i < len; ++i) {
      key = keys[i];
      const pathName = prefix + key;
      pathtype = this.$__schema.pathType(pathName);
      const valForKey = path[key];

      // On initial set, delete any nested keys if we're going to overwrite
      // them to ensure we keep the user's key order.
      if (type === true &&
          !prefix &&
          valForKey != null &&
          pathtype === 'nested' &&
          this._doc[key] != null) {
        delete this._doc[key];
        // Make sure we set `{}` back even if we minimize re: gh-8565
        options = Object.assign({}, options, { _skipMinimizeTopLevel: true });
      } else {
        // Make sure we set `{_skipMinimizeTopLevel: false}` if don't have overwrite: gh-10441
        options = Object.assign({}, options, { _skipMinimizeTopLevel: false });
      }

      if (utils.isNonBuiltinObject(valForKey) && pathtype === 'nested') {
        $applyDefaultsToNested(path[key], prefix + key, this);
        this.$set(prefix + key, path[key], constructing, Object.assign({}, options, { _skipMarkModified: true }));
        continue;
      } else if (strict) {
        // Don't overwrite defaults with undefined keys (gh-3981) (gh-9039)
        if (constructing && path[key] === void 0 &&
            this.$get(pathName) !== void 0) {
          continue;
        }

        if (pathtype === 'adhocOrUndefined') {
          pathtype = getEmbeddedDiscriminatorPath(this, pathName, { typeOnly: true });
        }

        if (pathtype === 'real' || pathtype === 'virtual') {
          const p = path[key];
          this.$set(prefix + key, p, constructing, options);
        } else if (pathtype === 'nested' && path[key] instanceof Document) {
          this.$set(prefix + key,
            path[key].toObject({ transform: false }), constructing, options);
        } else if (strict === 'throw') {
          if (pathtype === 'nested') {
            throw new ObjectExpectedError(key, path[key]);
          } else {
            throw new StrictModeError(key);
          }
        }
      } else if (path[key] !== void 0) {
        this.$set(prefix + key, path[key], constructing, options);
      }
    }

    // Ensure all properties are in correct order by deleting and recreating every property.
    for (const key of Object.keys(this.$__schema.tree)) {
      if (this._doc.hasOwnProperty(key)) {
        const val = this._doc[key];
        delete this._doc[key];
        this._doc[key] = val;
      }
    }

    return this;
  }

  let pathType = this.$__schema.pathType(path);
  if (pathType === 'adhocOrUndefined') {
    pathType = getEmbeddedDiscriminatorPath(this, path, { typeOnly: true });
  }

  // Assume this is a Mongoose document that was copied into a POJO using
  // `Object.assign()` or `{...doc}`
  val = handleSpreadDoc(val);

  // if this doc is being constructed we should not trigger getters
  const priorVal = (() => {
    if (this.$__.priorDoc != null) {
      return this.$__.priorDoc.$__getValue(path);
    }
    if (constructing) {
      return void 0;
    }
    return this.$__getValue(path);
  })();

  if (pathType === 'nested' && val) {
    if (typeof val === 'object' && val != null) {
      if (val.$__ != null) {
        val = val.toObject(internalToObjectOptions);
      }
      if (val == null) {
        this.invalidate(path, new MongooseError.CastError('Object', val, path));
        return this;
      }
      const hasInitialVal = this.$__.savedState != null && this.$__.savedState.hasOwnProperty(path);
      if (this.$__.savedState != null && !this.$isNew && !this.$__.savedState.hasOwnProperty(path)) {
        const initialVal = this.$__getValue(path);
        this.$__.savedState[path] = initialVal;

        const keys = Object.keys(initialVal || {});
        for (const key of keys) {
          this.$__.savedState[path + '.' + key] = initialVal[key];
        }
      }

      if (!merge) {
        this.$__setValue(path, null);
        cleanModifiedSubpaths(this, path);
      } else {
        return this.$set(val, path, constructing);
      }

      const keys = getKeysInSchemaOrder(this.$__schema, val, path);

      this.$__setValue(path, {});
      for (const key of keys) {
        this.$set(path + '.' + key, val[key], constructing, options);
      }
      if (priorVal != null && utils.deepEqual(hasInitialVal ? this.$__.savedState[path] : priorVal, val)) {
        this.unmarkModified(path);
      } else {
        this.markModified(path);
      }
      cleanModifiedSubpaths(this, path, { skipDocArrays: true });
      return this;
    }
    this.invalidate(path, new MongooseError.CastError('Object', val, path));
    return this;
  }

  let schema;
  const parts = path.indexOf('.') === -1 ? [path] : path.split('.');

  // Might need to change path for top-level alias
  if (typeof this.$__schema.aliases[parts[0]] === 'string') {
    parts[0] = this.$__schema.aliases[parts[0]];
  }

  if (pathType === 'adhocOrUndefined' && strict) {
    // check for roots that are Mixed types
    let mixed;

    for (i = 0; i < parts.length; ++i) {
      const subpath = parts.slice(0, i + 1).join('.');

      // If path is underneath a virtual, bypass everything and just set it.
      if (i + 1 < parts.length && this.$__schema.pathType(subpath) === 'virtual') {
        mpath.set(path, val, this);
        return this;
      }

      schema = this.$__schema.path(subpath);
      if (schema == null) {
        continue;
      }

      if (schema instanceof MixedSchema) {
        // allow changes to sub paths of mixed types
        mixed = true;
        break;
      }
    }

    if (schema == null) {
      // Check for embedded discriminators
      schema = getEmbeddedDiscriminatorPath(this, path);
    }

    if (!mixed && !schema) {
      if (strict === 'throw') {
        throw new StrictModeError(path);
      }
      return this;
    }
  } else if (pathType === 'virtual') {
    schema = this.$__schema.virtualpath(path);
    schema.applySetters(val, this);
    return this;
  } else {
    schema = this.$__path(path);
  }

  // gh-4578, if setting a deeply nested path that doesn't exist yet, create it
  let cur = this._doc;
  let curPath = '';
  for (i = 0; i < parts.length - 1; ++i) {
    cur = cur[parts[i]];
    curPath += (curPath.length !== 0 ? '.' : '') + parts[i];
    if (!cur) {
      this.$set(curPath, {});
      // Hack re: gh-5800. If nested field is not selected, it probably exists
      // so `MongoServerError: cannot use the part (nested of nested.num) to
      // traverse the element ({nested: null})` is not likely. If user gets
      // that error, its their fault for now. We should reconsider disallowing
      // modifying not selected paths for 6.x
      if (!this.$__isSelected(curPath)) {
        this.unmarkModified(curPath);
      }
      cur = this.$__getValue(curPath);
    }
  }

  let pathToMark;

  // When using the $set operator the path to the field must already exist.
  // Else mongodb throws: "LEFT_SUBFIELD only supports Object"

  if (parts.length <= 1) {
    pathToMark = path;
  } else {
    const len = parts.length;
    for (i = 0; i < len; ++i) {
      const subpath = parts.slice(0, i + 1).join('.');
      if (this.$get(subpath, null, { getters: false }) === null) {
        pathToMark = subpath;
        break;
      }
    }

    if (!pathToMark) {
      pathToMark = path;
    }
  }

  if (!schema) {
    this.$__set(pathToMark, path, options, constructing, parts, schema, val, priorVal);
    return this;
  }

  // If overwriting a subdocument path, make sure to clear out
  // any errors _before_ setting, so new errors that happen
  // get persisted. Re: #9080
  if (schema.$isSingleNested || schema.$isMongooseArray) {
    _markValidSubpaths(this, path);
  }

  if (val != null && merge && schema.$isSingleNested) {
    if (val instanceof Document) {
      val = val.toObject({ virtuals: false, transform: false });
    }
    const keys = Object.keys(val);
    for (const key of keys) {
      this.$set(path + '.' + key, val[key], constructing, options);
    }

    return this;
  }

  let shouldSet = true;
  try {
    // If the user is trying to set a ref path to a document with
    // the correct model name, treat it as populated
    const refMatches = (() => {
      if (schema.options == null) {
        return false;
      }
      if (!(val instanceof Document)) {
        return false;
      }
      const model = val.constructor;

      // Check ref
      const ref = schema.options.ref;
      if (ref != null && (ref === model.modelName || ref === model.baseModelName)) {
        return true;
      }

      // Check refPath
      const refPath = schema.options.refPath;
      if (refPath == null) {
        return false;
      }
      const modelName = val.get(refPath);
      return modelName === model.modelName || modelName === model.baseModelName;
    })();

    let didPopulate = false;
    if (refMatches && val instanceof Document) {
      const unpopulatedValue = (schema && schema.$isSingleNested) ? schema.cast(val, this) : val._id;
      this.$populated(path, unpopulatedValue, { [populateModelSymbol]: val.constructor });
      val.$__.wasPopulated = { value: unpopulatedValue };
      didPopulate = true;
    }

    let popOpts;
    if (schema.options &&
        Array.isArray(schema.options[typeKey]) &&
        schema.options[typeKey].length &&
        schema.options[typeKey][0].ref &&
        _isManuallyPopulatedArray(val, schema.options[typeKey][0].ref)) {
      popOpts = { [populateModelSymbol]: val[0].constructor };
      this.$populated(path, val.map(function(v) { return v._id; }), popOpts);

      for (const doc of val) {
        doc.$__.wasPopulated = { value: doc._id };
      }
      didPopulate = true;
    }

    if (this.$__schema.singleNestedPaths[path] == null && (!refMatches || !schema.$isSingleNested || !val.$__)) {
      // If this path is underneath a single nested schema, we'll call the setter
      // later in `$__set()` because we don't take `_doc` when we iterate through
      // a single nested doc. That's to make sure we get the correct context.
      // Otherwise we would double-call the setter, see gh-7196.
      val = schema.applySetters(val, this, false, priorVal);
    }

    if (Array.isArray(val) &&
        !Array.isArray(schema) &&
        schema.$isMongooseDocumentArray &&
        val.length !== 0 &&
        val[0] != null &&
        val[0].$__ != null &&
        val[0].$__.populated != null) {
      const populatedPaths = Object.keys(val[0].$__.populated);
      for (const populatedPath of populatedPaths) {
        this.$populated(path + '.' + populatedPath,
          val.map(v => v.$populated(populatedPath)),
          val[0].$__.populated[populatedPath].options);
      }
      didPopulate = true;
    }

    if (!didPopulate && this.$__.populated) {
      // If this array partially contains populated documents, convert them
      // all to ObjectIds re: #8443
      if (Array.isArray(val) && this.$__.populated[path]) {
        for (let i = 0; i < val.length; ++i) {
          if (val[i] instanceof Document) {
            val.set(i, val[i]._id, true);
          }
        }
      }
      delete this.$__.populated[path];
    }

    if (val != null && schema.$isSingleNested) {
      _checkImmutableSubpaths(val, schema, priorVal);
    }

    this.$markValid(path);
  } catch (e) {
    if (e instanceof MongooseError.StrictModeError && e.isImmutableError) {
      this.invalidate(path, e);
    } else if (e instanceof MongooseError.CastError) {
      this.invalidate(e.path, e);
      if (e.$originalErrorPath) {
        this.invalidate(path,
          new MongooseError.CastError(schema.instance, val, path, e.$originalErrorPath));
      }
    } else {
      this.invalidate(path,
        new MongooseError.CastError(schema.instance, val, path, e));
    }
    shouldSet = false;
  }

  if (shouldSet) {
    const doc = this.$isSubdocument ? this.ownerDocument() : this;
    const savedState = doc.$__.savedState;
    const savedStatePath = this.$isSubdocument ? this.$__.fullPath + '.' + path : path;
    if (savedState != null) {
      const firstDot = savedStatePath.indexOf('.');
      const topLevelPath = firstDot === -1 ? savedStatePath : savedStatePath.slice(0, firstDot);
      if (!savedState.hasOwnProperty(topLevelPath)) {
        savedState[topLevelPath] = utils.clone(doc.$__getValue(topLevelPath));
      }
    }

    this.$__set(pathToMark, path, options, constructing, parts, schema, val, priorVal);

    if (savedState != null && savedState.hasOwnProperty(savedStatePath) && utils.deepEqual(val, savedState[savedStatePath])) {
      this.unmarkModified(path);
    }
  }

  if (schema.$isSingleNested && (this.isDirectModified(path) || val == null)) {
    cleanModifiedSubpaths(this, path);
  }

  return this;
};

/*!
 * ignore
 */

function _isManuallyPopulatedArray(val, ref) {
  if (!Array.isArray(val)) {
    return false;
  }
  if (val.length === 0) {
    return false;
  }

  for (const el of val) {
    if (!(el instanceof Document)) {
      return false;
    }
    const modelName = el.constructor.modelName;
    if (modelName == null) {
      return false;
    }
    if (el.constructor.modelName != ref && el.constructor.baseModelName != ref) {
      return false;
    }
  }

  return true;
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
 * @instance
 */

Document.prototype.set = Document.prototype.$set;

/**
 * Determine if we should mark this change as modified.
 *
 * @return {Boolean}
 * @api private
 * @method $__shouldModify
 * @memberOf Document
 * @instance
 */

Document.prototype.$__shouldModify = function(pathToMark, path, options, constructing, parts, schema, val, priorVal) {
  if (options._skipMarkModified) {
    return false;
  }
  if (this.$isNew) {
    return true;
  }

  // Re: the note about gh-7196, `val` is the raw value without casting or
  // setters if the full path is under a single nested subdoc because we don't
  // want to double run setters. So don't set it as modified. See gh-7264.
  if (this.$__schema.singleNestedPaths[path] != null) {
    return false;
  }

  if (val === void 0 && !this.$__isSelected(path)) {
    // when a path is not selected in a query, its initial
    // value will be undefined.
    return true;
  }

  if (val === void 0 && path in this.$__.activePaths.states.default) {
    // we're just unsetting the default value which was never saved
    return false;
  }

  // gh-3992: if setting a populated field to a doc, don't mark modified
  // if they have the same _id
  if (this.$populated(path) &&
      val instanceof Document &&
      deepEqual(val._id, priorVal)) {
    return false;
  }

  if (!deepEqual(val, priorVal || utils.getValue(path, this))) {
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
 * @instance
 */

Document.prototype.$__set = function(pathToMark, path, options, constructing, parts, schema, val, priorVal) {
  Embedded = Embedded || require('./types/ArraySubdocument');

  const shouldModify = this.$__shouldModify(pathToMark, path, options, constructing, parts,
    schema, val, priorVal);
  const _this = this;

  if (shouldModify) {
    this.markModified(pathToMark);

    // handle directly setting arrays (gh-1126)
    MongooseArray || (MongooseArray = require('./types/array'));
    if (val && utils.isMongooseArray(val)) {
      val._registerAtomic('$set', val);

      // Update embedded document parent references (gh-5189)
      if (utils.isMongooseDocumentArray(val)) {
        val.forEach(function(item) {
          item && item.__parentArray && (item.__parentArray = val);
        });
      }

      // Small hack for gh-1638: if we're overwriting the entire array, ignore
      // paths that were modified before the array overwrite
      this.$__.activePaths.forEach(function(modifiedPath) {
        if (modifiedPath.startsWith(path + '.')) {
          _this.$__.activePaths.ignore(modifiedPath);
        }
      });
    }
  } else if (Array.isArray(val) && Array.isArray(priorVal) && utils.isMongooseArray(val) && utils.isMongooseArray(priorVal)) {
    val[arrayAtomicsSymbol] = priorVal[arrayAtomicsSymbol];
    val[arrayAtomicsBackupSymbol] = priorVal[arrayAtomicsBackupSymbol];
    if (utils.isMongooseDocumentArray(val)) {
      val.forEach(doc => { doc.isNew = false; });
    }
  }

  let obj = this._doc;
  let i = 0;
  const l = parts.length;
  let cur = '';

  for (; i < l; i++) {
    const next = i + 1;
    const last = next === l;
    cur += (cur ? '.' + parts[i] : parts[i]);
    if (specialProperties.has(parts[i])) {
      return;
    }

    if (last) {
      if (obj instanceof Map) {
        obj.set(parts[i], val);
      } else {
        obj[parts[i]] = val;
      }
    } else {
      if (utils.isPOJO(obj[parts[i]])) {
        obj = obj[parts[i]];
      } else if (obj[parts[i]] && obj[parts[i]] instanceof Embedded) {
        obj = obj[parts[i]];
      } else if (obj[parts[i]] && !Array.isArray(obj[parts[i]]) && obj[parts[i]].$isSingleNested) {
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

Document.prototype.$__getValue = function(path) {
  return utils.getValue(path, this._doc);
};

/**
 * Sets a raw value for a path (no casting, setters, transformations)
 *
 * @param {String} path
 * @param {Object} value
 * @api private
 */

Document.prototype.$__setValue = function(path, val) {
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
 * @param {Object} [options]
 * @param {Boolean} [options.virtuals=false] Apply virtuals before getting this path
 * @param {Boolean} [options.getters=true] If false, skip applying getters and just get the raw value
 * @api public
 */

Document.prototype.get = function(path, type, options) {
  let adhoc;
  options = options || {};
  if (type) {
    adhoc = this.$__schema.interpretAsType(path, type, this.$__schema.options);
  }

  let schema = this.$__path(path);
  if (schema == null) {
    schema = this.$__schema.virtualpath(path);
  }
  if (schema instanceof MixedSchema) {
    const virtual = this.$__schema.virtualpath(path);
    if (virtual != null) {
      schema = virtual;
    }
  }
  const pieces = path.indexOf('.') === -1 ? [path] : path.split('.');
  let obj = this._doc;

  if (schema instanceof VirtualType) {
    return schema.applyGetters(void 0, this);
  }

  // Might need to change path for top-level alias
  if (typeof this.$__schema.aliases[pieces[0]] === 'string') {
    pieces[0] = this.$__schema.aliases[pieces[0]];
  }

  for (let i = 0, l = pieces.length; i < l; i++) {
    if (obj && obj._doc) {
      obj = obj._doc;
    }

    if (obj == null) {
      obj = void 0;
    } else if (obj instanceof Map) {
      obj = obj.get(pieces[i], { getters: false });
    } else if (i === l - 1) {
      obj = utils.getValue(pieces[i], obj);
    } else {
      obj = obj[pieces[i]];
    }
  }

  if (adhoc) {
    obj = adhoc.cast(obj);
  }

  if (schema != null && options.getters !== false) {
    obj = schema.applyGetters(obj, this);
  } else if (this.$__schema.nested[path] && options.virtuals) {
    // Might need to apply virtuals if this is a nested path
    return applyVirtuals(this, utils.clone(obj) || {}, { path: path });
  }

  return obj;
};

/*!
 * ignore
 */

Document.prototype[getSymbol] = Document.prototype.get;
Document.prototype.$get = Document.prototype.get;
/**
 * Returns the schematype for the given `path`.
 *
 * @param {String} path
 * @api private
 * @method $__path
 * @memberOf Document
 * @instance
 */

Document.prototype.$__path = function(path) {
  const adhocs = this.$__.adhocPaths;
  const adhocType = adhocs && adhocs.hasOwnProperty(path) ? adhocs[path] : null;

  if (adhocType) {
    return adhocType;
  }
  return this.$__schema.path(path);
};

/**
 * Marks the path as having pending changes to write to the db.
 *
 * _Very helpful when using [Mixed](https://mongoosejs.com/docs/schematypes.html#mixed) types._
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
  if (scope != null && !this.$isSubdocument) {
    this.$__.pathsToScopes = this.$__pathsToScopes || {};
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
 *     doc.save(); // changes to foo will not be persisted
 *
 * @param {String} path the path to unmark modified
 * @api public
 */

Document.prototype.unmarkModified = function(path) {
  this.$__.activePaths.init(path);
  if (this.$__.pathsToScopes != null) {
    delete this.$__.pathsToScopes[path];
  }
};

/**
 * Don't run validation on this path or persist changes to this path.
 *
 * ####Example:
 *
 *     doc.foo = null;
 *     doc.$ignore('foo');
 *     doc.save(); // changes to foo will not be persisted and validators won't be run
 *
 * @memberOf Document
 * @instance
 * @method $ignore
 * @param {String} path the path to ignore
 * @api public
 */

Document.prototype.$ignore = function(path) {
  this.$__.activePaths.ignore(path);
};

/**
 * Returns the list of paths that have been directly modified. A direct
 * modified path is a path that you explicitly set, whether via `doc.foo = 'bar'`,
 * `Object.assign(doc, { foo: 'bar' })`, or `doc.set('foo', 'bar')`.
 *
 * A path `a` may be in `modifiedPaths()` but not in `directModifiedPaths()`
 * because a child of `a` was directly modified.
 *
 * ####Example
 *     const schema = new Schema({ foo: String, nested: { bar: String } });
 *     const Model = mongoose.model('Test', schema);
 *     await Model.create({ foo: 'original', nested: { bar: 'original' } });
 *
 *     const doc = await Model.findOne();
 *     doc.nested.bar = 'modified';
 *     doc.directModifiedPaths(); // ['nested.bar']
 *     doc.modifiedPaths(); // ['nested', 'nested.bar']
 *
 * @return {Array}
 * @api public
 */

Document.prototype.directModifiedPaths = function() {
  return Object.keys(this.$__.activePaths.states.modify);
};

/**
 * Returns true if the given path is nullish or only contains empty objects.
 * Useful for determining whether this subdoc will get stripped out by the
 * [minimize option](/docs/guide.html#minimize).
 *
 * ####Example:
 *     const schema = new Schema({ nested: { foo: String } });
 *     const Model = mongoose.model('Test', schema);
 *     const doc = new Model({});
 *     doc.$isEmpty('nested'); // true
 *     doc.nested.$isEmpty(); // true
 *
 *     doc.nested.foo = 'bar';
 *     doc.$isEmpty('nested'); // false
 *     doc.nested.$isEmpty(); // false
 *
 * @memberOf Document
 * @instance
 * @api public
 * @method $isEmpty
 * @return {Boolean}
 */

Document.prototype.$isEmpty = function(path) {
  const isEmptyOptions = {
    minimize: true,
    virtuals: false,
    getters: false,
    transform: false
  };

  if (arguments.length !== 0) {
    const v = this.$get(path);
    if (v == null) {
      return true;
    }
    if (typeof v !== 'object') {
      return false;
    }
    if (utils.isPOJO(v)) {
      return _isEmpty(v);
    }
    return Object.keys(v.toObject(isEmptyOptions)).length === 0;
  }

  return Object.keys(this.toObject(isEmptyOptions)).length === 0;
};

function _isEmpty(v) {
  if (v == null) {
    return true;
  }
  if (typeof v !== 'object' || Array.isArray(v)) {
    return false;
  }
  for (const key of Object.keys(v)) {
    if (!_isEmpty(v[key])) {
      return false;
    }
  }
  return true;
}

/**
 * Returns the list of paths that have been modified.
 *
 * @param {Object} [options]
 * @param {Boolean} [options.includeChildren=false] if true, returns children of modified paths as well. For example, if false, the list of modified paths for `doc.colors = { primary: 'blue' };` will **not** contain `colors.primary`. If true, `modifiedPaths()` will return an array that contains `colors.primary`.
 * @return {Array}
 * @api public
 */

Document.prototype.modifiedPaths = function(options) {
  options = options || {};

  const directModifiedPaths = Object.keys(this.$__.activePaths.states.modify);
  const result = new Set();

  let i = 0;
  let j = 0;
  const len = directModifiedPaths.length;

  for (i = 0; i < len; ++i) {
    const path = directModifiedPaths[i];
    const parts = parentPaths(path);
    const pLen = parts.length;

    for (j = 0; j < pLen; ++j) {
      result.add(parts[j]);
    }

    if (!options.includeChildren) {
      continue;
    }

    let ii = 0;
    let cur = this.$get(path);
    if (typeof cur === 'object' && cur !== null) {
      if (cur._doc) {
        cur = cur._doc;
      }
      const len = cur.length;
      if (Array.isArray(cur)) {
        for (ii = 0; ii < len; ++ii) {
          const subPath = path + '.' + ii;
          if (!result.has(subPath)) {
            result.add(subPath);
            if (cur[ii] != null && cur[ii].$__) {
              const modified = cur[ii].modifiedPaths();
              let iii = 0;
              const iiiLen = modified.length;
              for (iii = 0; iii < iiiLen; ++iii) {
                result.add(subPath + '.' + modified[iii]);
              }
            }
          }
        }
      } else {
        const keys = Object.keys(cur);
        let ii = 0;
        const len = keys.length;
        for (ii = 0; ii < len; ++ii) {
          result.add(path + '.' + keys[ii]);
        }
      }
    }
  }
  return Array.from(result);
};

Document.prototype[documentModifiedPaths] = Document.prototype.modifiedPaths;

/**
 * Returns true if any of the given paths is modified, else false. If no arguments, returns `true` if any path
 * in this document is modified.
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
    const directModifiedPaths = Object.keys(this.$__.activePaths.states.modify);
    if (directModifiedPaths.length === 0) {
      return false;
    }

    if (!Array.isArray(paths)) {
      paths = paths.indexOf(' ') === -1 ? [paths] : paths.split(' ');
    }
    const modified = modifiedPaths || this[documentModifiedPaths]();
    const isModifiedChild = paths.some(function(path) {
      return !!~modified.indexOf(path);
    });

    return isModifiedChild || paths.some(function(path) {
      return directModifiedPaths.some(function(mod) {
        return mod === path || path.startsWith(mod + '.');
      });
    });
  }

  return this.$__.activePaths.some('modify');
};

Document.prototype.$isModified = Document.prototype.isModified;

Document.prototype[documentIsModified] = Document.prototype.isModified;

/**
 * Checks if a path is set to its default.
 *
 * ####Example
 *
 *     MyModel = mongoose.model('test', { name: { type: String, default: 'Val '} });
 *     const m = new MyModel();
 *     m.$isDefault('name'); // true
 *
 * @memberOf Document
 * @instance
 * @method $isDefault
 * @param {String} [path]
 * @return {Boolean}
 * @api public
 */

Document.prototype.$isDefault = function(path) {
  if (path == null) {
    return this.$__.activePaths.some('default');
  }

  if (typeof path === 'string' && path.indexOf(' ') === -1) {
    return this.$__.activePaths.states.default.hasOwnProperty(path);
  }

  let paths = path;
  if (!Array.isArray(paths)) {
    paths = paths.split(' ');
  }

  return paths.some(path => this.$__.activePaths.states.default.hasOwnProperty(path));
};

/**
 * Getter/setter, determines whether the document was removed or not.
 *
 * ####Example:
 *     const product = await product.remove();
 *     product.$isDeleted(); // true
 *     product.remove(); // no-op, doesn't send anything to the db
 *
 *     product.$isDeleted(false);
 *     product.$isDeleted(); // false
 *     product.remove(); // will execute a remove against the db
 *
 *
 * @param {Boolean} [val] optional, overrides whether mongoose thinks the doc is deleted
 * @return {Boolean} whether mongoose thinks this doc is deleted.
 * @method $isDeleted
 * @memberOf Document
 * @instance
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
 * @param {String|Array<String>} path
 * @return {Boolean}
 * @api public
 */

Document.prototype.isDirectModified = function(path) {
  if (path == null) {
    return this.$__.activePaths.some('modify');
  }

  if (typeof path === 'string' && path.indexOf(' ') === -1) {
    return this.$__.activePaths.states.modify.hasOwnProperty(path);
  }

  let paths = path;
  if (!Array.isArray(paths)) {
    paths = paths.split(' ');
  }

  return paths.some(path => this.$__.activePaths.states.modify.hasOwnProperty(path));
};

/**
 * Checks if `path` is in the `init` state, that is, it was set by `Document#init()` and not modified since.
 *
 * @param {String} path
 * @return {Boolean}
 * @api public
 */

Document.prototype.isInit = function(path) {
  if (path == null) {
    return this.$__.activePaths.some('init');
  }

  if (typeof path === 'string' && path.indexOf(' ') === -1) {
    return this.$__.activePaths.states.init.hasOwnProperty(path);
  }

  let paths = path;
  if (!Array.isArray(paths)) {
    paths = paths.split(' ');
  }

  return paths.some(path => this.$__.activePaths.states.init.hasOwnProperty(path));
};

/**
 * Checks if `path` was selected in the source query which initialized this document.
 *
 * ####Example
 *
 *     const doc = await Thing.findOne().select('name');
 *     doc.isSelected('name') // true
 *     doc.isSelected('age')  // false
 *
 * @param {String|Array<String>} path
 * @return {Boolean}
 * @api public
 */

Document.prototype.isSelected = function isSelected(path) {
  if (this.$__.selected == null) {
    return true;
  }
  if (!path) {
    return false;
  }
  if (path === '_id') {
    return this.$__.selected._id !== 0;
  }

  if (path.indexOf(' ') !== -1) {
    path = path.split(' ');
  }
  if (Array.isArray(path)) {
    return path.some(p => this.$__isSelected(p));
  }

  const paths = Object.keys(this.$__.selected);
  let inclusive = null;

  if (paths.length === 1 && paths[0] === '_id') {
    // only _id was selected.
    return this.$__.selected._id === 0;
  }

  for (const cur of paths) {
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

  const pathDot = path + '.';

  for (const cur of paths) {
    if (cur === '_id') {
      continue;
    }

    if (cur.startsWith(pathDot)) {
      return inclusive || cur !== pathDot;
    }

    if (pathDot.startsWith(cur + '.')) {
      return inclusive;
    }
  }

  return !inclusive;
};

Document.prototype.$__isSelected = Document.prototype.isSelected;

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
  if (this.$__.selected == null) {
    return true;
  }

  if (path === '_id') {
    return this.$__.selected._id !== 0;
  }

  if (path.indexOf(' ') !== -1) {
    path = path.split(' ');
  }
  if (Array.isArray(path)) {
    return path.some(p => this.isDirectSelected(p));
  }

  const paths = Object.keys(this.$__.selected);
  let inclusive = null;

  if (paths.length === 1 && paths[0] === '_id') {
    // only _id was selected.
    return this.$__.selected._id === 0;
  }

  for (const cur of paths) {
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

  if (this.$__.selected.hasOwnProperty(path)) {
    return inclusive;
  }

  return !inclusive;
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
 * @param {Array|String} [pathsToValidate] list of paths to validate. If set, Mongoose will validate only the modified paths that are in the given list.
 * @param {Object} [options] internal options
 * @param {Boolean} [options.validateModifiedOnly=false] if `true` mongoose validates only modified paths.
 * @param {Array|string} [options.pathsToSkip] list of paths to skip. If set, Mongoose will validate every modified path that is not in this list.
 * @param {Function} [callback] optional callback called after validation completes, passing an error if one occurred
 * @return {Promise} Promise
 * @api public
 */

Document.prototype.validate = function(pathsToValidate, options, callback) {
  let parallelValidate;
  this.$op = 'validate';

  if (this.$isSubdocument != null) {
    // Skip parallel validate check for subdocuments
  } else if (this.$__.validating) {
    parallelValidate = new ParallelValidateError(this, {
      parentStack: options && options.parentStack,
      conflictStack: this.$__.validating.stack
    });
  } else {
    this.$__.validating = new ParallelValidateError(this, { parentStack: options && options.parentStack });
  }

  if (arguments.length === 1) {
    if (typeof arguments[0] === 'object' && !Array.isArray(arguments[0])) {
      options = arguments[0];
      callback = null;
      pathsToValidate = null;
    } else if (typeof arguments[0] === 'function') {
      callback = arguments[0];
      options = null;
      pathsToValidate = null;
    }
  } else if (typeof pathsToValidate === 'function') {
    callback = pathsToValidate;
    options = null;
    pathsToValidate = null;
  } else if (typeof options === 'function') {
    callback = options;
    options = pathsToValidate;
    pathsToValidate = null;
  }
  if (options && typeof options.pathsToSkip === 'string') {
    const isOnePathOnly = options.pathsToSkip.indexOf(' ') === -1;
    options.pathsToSkip = isOnePathOnly ? [options.pathsToSkip] : options.pathsToSkip.split(' ');
  }

  return promiseOrCallback(callback, cb => {
    if (parallelValidate != null) {
      return cb(parallelValidate);
    }

    this.$__validate(pathsToValidate, options, (error) => {
      this.$op = null;
      cb(error);
    });
  }, this.constructor.events);
};

Document.prototype.$validate = Document.prototype.validate;

/*!
 * ignore
 */

function _evaluateRequiredFunctions(doc) {
  const requiredFields = Object.keys(doc.$__.activePaths.states.require);
  let i = 0;
  const len = requiredFields.length;
  for (i = 0; i < len; ++i) {
    const path = requiredFields[i];

    const p = doc.$__schema.path(path);

    if (p != null && typeof p.originalRequiredValue === 'function') {
      doc.$__.cachedRequired = doc.$__.cachedRequired || {};
      try {
        doc.$__.cachedRequired[path] = p.originalRequiredValue.call(doc, doc);
      } catch (err) {
        doc.invalidate(path, err);
      }
    }
  }
}

/*!
 * ignore
 */

function _getPathsToValidate(doc) {
  const skipSchemaValidators = {};

  _evaluateRequiredFunctions(doc);
  // only validate required fields when necessary
  let paths = new Set(Object.keys(doc.$__.activePaths.states.require).filter(function(path) {
    if (!doc.$__isSelected(path) && !doc.$isModified(path)) {
      return false;
    }
    if (doc.$__.cachedRequired != null && path in doc.$__.cachedRequired) {
      return doc.$__.cachedRequired[path];
    }
    return true;
  }));


  Object.keys(doc.$__.activePaths.states.init).forEach(addToPaths);
  Object.keys(doc.$__.activePaths.states.modify).forEach(addToPaths);
  Object.keys(doc.$__.activePaths.states.default).forEach(addToPaths);
  function addToPaths(p) { paths.add(p); }

  const subdocs = doc.$getAllSubdocs();
  const modifiedPaths = doc.modifiedPaths();
  for (const subdoc of subdocs) {
    if (subdoc.$basePath) {
      // Remove child paths for now, because we'll be validating the whole
      // subdoc
      for (const p of paths) {
        if (p === null || p.startsWith(subdoc.$basePath + '.')) {
          paths.delete(p);
        }
      }

      if (doc.$isModified(subdoc.$basePath, modifiedPaths) &&
            !doc.isDirectModified(subdoc.$basePath) &&
            !doc.$isDefault(subdoc.$basePath)) {
        paths.add(subdoc.$basePath);

        skipSchemaValidators[subdoc.$basePath] = true;
      }
    }
  }

  // from here on we're not removing items from paths

  // gh-661: if a whole array is modified, make sure to run validation on all
  // the children as well
  for (const path of paths) {
    const _pathType = doc.$__schema.path(path);
    if (!_pathType ||
        !_pathType.$isMongooseArray ||
        // To avoid potential performance issues, skip doc arrays whose children
        // are not required. `getPositionalPathType()` may be slow, so avoid
        // it unless we have a case of #6364
        (!Array.isArray(_pathType) &&
          _pathType.$isMongooseDocumentArray &&
          !(_pathType && _pathType.schemaOptions && _pathType.schemaOptions.required))) {
      continue;
    }

    const val = doc.$__getValue(path);
    _pushNestedArrayPaths(val, paths, path);
  }

  function _pushNestedArrayPaths(val, paths, path) {
    if (val != null) {
      const numElements = val.length;
      for (let j = 0; j < numElements; ++j) {
        if (Array.isArray(val[j])) {
          _pushNestedArrayPaths(val[j], paths, path + '.' + j);
        } else {
          paths.add(path + '.' + j);
        }
      }
    }
  }

  const flattenOptions = { skipArrays: true };
  for (const pathToCheck of paths) {
    if (doc.$__schema.nested[pathToCheck]) {
      let _v = doc.$__getValue(pathToCheck);
      if (isMongooseObject(_v)) {
        _v = _v.toObject({ transform: false });
      }
      const flat = flatten(_v, pathToCheck, flattenOptions, doc.$__schema);
      Object.keys(flat).forEach(addToPaths);
    }
  }

  for (const path of paths) {
    // Single nested paths (paths embedded under single nested subdocs) will
    // be validated on their own when we call `validate()` on the subdoc itself.
    // Re: gh-8468
    if (doc.$__schema.singleNestedPaths.hasOwnProperty(path)) {
      paths.delete(path);
      continue;
    }
    const _pathType = doc.$__schema.path(path);
    if (!_pathType || !_pathType.$isSchemaMap) {
      continue;
    }

    const val = doc.$__getValue(path);
    if (val == null) {
      continue;
    }
    for (const key of val.keys()) {
      paths.add(path + '.' + key);
    }
  }

  paths = Array.from(paths);
  return [paths, skipSchemaValidators];
}

/*!
 * ignore
 */

Document.prototype.$__validate = function(pathsToValidate, options, callback) {
  if (typeof pathsToValidate === 'function') {
    callback = pathsToValidate;
    options = null;
    pathsToValidate = null;
  } else if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  const hasValidateModifiedOnlyOption = options &&
      (typeof options === 'object') &&
      ('validateModifiedOnly' in options);

  const pathsToSkip = (options && options.pathsToSkip) || null;

  let shouldValidateModifiedOnly;
  if (hasValidateModifiedOnlyOption) {
    shouldValidateModifiedOnly = !!options.validateModifiedOnly;
  } else {
    shouldValidateModifiedOnly = this.$__schema.options.validateModifiedOnly;
  }

  const _this = this;
  const _complete = () => {
    let validationError = this.$__.validationError;
    this.$__.validationError = undefined;

    if (shouldValidateModifiedOnly && validationError != null) {
      // Remove any validation errors that aren't from modified paths
      const errors = Object.keys(validationError.errors);
      for (const errPath of errors) {
        if (!this.$isModified(errPath)) {
          delete validationError.errors[errPath];
        }
      }
      if (Object.keys(validationError.errors).length === 0) {
        validationError = void 0;
      }
    }

    this.$__.cachedRequired = {};
    this.$emit('validate', _this);
    this.constructor.emit('validate', _this);

    if (validationError) {
      for (const key in validationError.errors) {
        // Make sure cast errors persist
        if (!this[documentArrayParent] &&
            validationError.errors[key] instanceof MongooseError.CastError) {
          this.invalidate(key, validationError.errors[key]);
        }
      }

      return validationError;
    }
  };

  // only validate required fields when necessary
  const pathDetails = _getPathsToValidate(this);
  let paths = shouldValidateModifiedOnly ?
    pathDetails[0].filter((path) => this.$isModified(path)) :
    pathDetails[0];
  const skipSchemaValidators = pathDetails[1];
  if (typeof pathsToValidate === 'string') {
    pathsToValidate = pathsToValidate.split(' ');
  }
  if (Array.isArray(pathsToValidate)) {
    paths = _handlePathsToValidate(paths, pathsToValidate);
  } else if (pathsToSkip) {
    paths = _handlePathsToSkip(paths, pathsToSkip);
  }
  if (paths.length === 0) {
    return immediate(function() {
      const error = _complete();
      if (error) {
        return _this.$__schema.s.hooks.execPost('validate:error', _this, [_this], { error: error }, function(error) {
          callback(error);
        });
      }
      callback(null, _this);
    });
  }

  const validated = {};
  let total = 0;

  for (const path of paths) {
    validatePath(path);
  }

  function validatePath(path) {
    if (path == null || validated[path]) {
      return;
    }

    validated[path] = true;
    total++;

    immediate(function() {
      const schemaType = _this.$__schema.path(path);

      if (!schemaType) {
        return --total || complete();
      }

      // If user marked as invalid or there was a cast error, don't validate
      if (!_this.$isValid(path)) {
        --total || complete();
        return;
      }

      // If setting a path under a mixed path, avoid using the mixed path validator (gh-10141)
      if (schemaType[schemaMixedSymbol] != null && path !== schemaType.path) {
        return --total || complete();
      }

      let val = _this.$__getValue(path);

      // If you `populate()` and get back a null value, required validators
      // shouldn't fail (gh-8018). We should always fall back to the populated
      // value.
      let pop;
      if ((pop = _this.$populated(path))) {
        val = pop;
      } else if (val != null && val.$__ != null && val.$__.wasPopulated) {
        // Array paths, like `somearray.1`, do not show up as populated with `$populated()`,
        // so in that case pull out the document's id
        val = val._id;
      }
      const scope = _this.$__.pathsToScopes != null && path in _this.$__.pathsToScopes ?
        _this.$__.pathsToScopes[path] :
        _this;

      const doValidateOptions = {
        skipSchemaValidators: skipSchemaValidators[path],
        path: path,
        validateModifiedOnly: shouldValidateModifiedOnly
      };

      schemaType.doValidate(val, function(err) {
        if (err) {
          const isSubdoc = schemaType.$isSingleNested ||
            schemaType.$isArraySubdocument ||
            schemaType.$isMongooseDocumentArray;
          if (isSubdoc && err instanceof ValidationError) {
            return --total || complete();
          }
          _this.invalidate(path, err, undefined, true);
        }
        --total || complete();
      }, scope, doValidateOptions);
    });
  }

  function complete() {
    const error = _complete();
    if (error) {
      return _this.$__schema.s.hooks.execPost('validate:error', _this, [_this], { error: error }, function(error) {
        callback(error);
      });
    }
    callback(null, _this);
  }

};

/*!
 * ignore
 */

function _handlePathsToValidate(paths, pathsToValidate) {
  const _pathsToValidate = new Set(pathsToValidate);
  const parentPaths = new Map([]);
  for (const path of pathsToValidate) {
    if (path.indexOf('.') === -1) {
      continue;
    }
    const pieces = path.split('.');
    let cur = pieces[0];
    for (let i = 1; i < pieces.length; ++i) {
      // Since we skip subpaths under single nested subdocs to
      // avoid double validation, we need to add back the
      // single nested subpath if the user asked for it (gh-8626)
      parentPaths.set(cur, path);
      cur = cur + '.' + pieces[i];
    }
  }

  const ret = [];
  for (const path of paths) {
    if (_pathsToValidate.has(path)) {
      ret.push(path);
    } else if (parentPaths.has(path)) {
      ret.push(parentPaths.get(path));
    }
  }
  return ret;
}

/*!
 * ignore
 */
function _handlePathsToSkip(paths, pathsToSkip) {
  pathsToSkip = new Set(pathsToSkip);
  paths = paths.filter(p => !pathsToSkip.has(p));
  return paths;
}

/**
 * Executes registered validation rules (skipping asynchronous validators) for this document.
 *
 * ####Note:
 *
 * This method is useful if you need synchronous validation.
 *
 * ####Example:
 *
 *     const err = doc.validateSync();
 *     if (err) {
 *       handleError(err);
 *     } else {
 *       // validation passed
 *     }
 *
 * @param {Array|string} pathsToValidate only validate the given paths
 * @param {Object} [options] options for validation
 * @param {Boolean} [options.validateModifiedOnly=false] If `true`, Mongoose will only validate modified paths, as opposed to modified paths and `required` paths.
 * @param {Array|string} [options.pathsToSkip] list of paths to skip. If set, Mongoose will validate every modified path that is not in this list.
 * @return {ValidationError|undefined} ValidationError if there are errors during validation, or undefined if there is no error.
 * @api public
 */

Document.prototype.validateSync = function(pathsToValidate, options) {
  const _this = this;

  if (arguments.length === 1 && typeof arguments[0] === 'object' && !Array.isArray(arguments[0])) {
    options = arguments[0];
    pathsToValidate = null;
  }

  const hasValidateModifiedOnlyOption = options &&
      (typeof options === 'object') &&
      ('validateModifiedOnly' in options);

  let shouldValidateModifiedOnly;
  if (hasValidateModifiedOnlyOption) {
    shouldValidateModifiedOnly = !!options.validateModifiedOnly;
  } else {
    shouldValidateModifiedOnly = this.$__schema.options.validateModifiedOnly;
  }

  let pathsToSkip = options && options.pathsToSkip;

  if (typeof pathsToValidate === 'string') {
    const isOnePathOnly = pathsToValidate.indexOf(' ') === -1;
    pathsToValidate = isOnePathOnly ? [pathsToValidate] : pathsToValidate.split(' ');
  } else if (typeof pathsToSkip === 'string' && pathsToSkip.indexOf(' ') !== -1) {
    pathsToSkip = pathsToSkip.split(' ');
  }

  // only validate required fields when necessary
  const pathDetails = _getPathsToValidate(this);
  let paths = shouldValidateModifiedOnly ?
    pathDetails[0].filter((path) => this.$isModified(path)) :
    pathDetails[0];
  const skipSchemaValidators = pathDetails[1];

  if (Array.isArray(pathsToValidate)) {
    paths = _handlePathsToValidate(paths, pathsToValidate);
  } else if (Array.isArray(pathsToSkip)) {
    paths = _handlePathsToSkip(paths, pathsToSkip);
  }
  const validating = {};

  for (let i = 0, len = paths.length; i < len; ++i) {
    const path = paths[i];

    if (validating[path]) {
      continue;
    }

    validating[path] = true;

    const p = _this.$__schema.path(path);
    if (!p) {
      continue;
    }
    if (!_this.$isValid(path)) {
      continue;
    }

    const val = _this.$__getValue(path);
    const err = p.doValidateSync(val, _this, {
      skipSchemaValidators: skipSchemaValidators[path],
      path: path,
      validateModifiedOnly: shouldValidateModifiedOnly
    });
    if (err) {
      const isSubdoc = p.$isSingleNested ||
        p.$isArraySubdocument ||
        p.$isMongooseDocumentArray;
      if (isSubdoc && err instanceof ValidationError) {
        continue;
      }
      _this.invalidate(path, err, undefined, true);
    }
  }

  const err = _this.$__.validationError;
  _this.$__.validationError = undefined;
  _this.$emit('validate', _this);
  _this.constructor.emit('validate', _this);

  if (err) {
    for (const key in err.errors) {
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
 * @param {String} path the field to invalidate. For array elements, use the `array.i.field` syntax, where `i` is the 0-based index in the array.
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
 * @instance
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

/*!
 * ignore
 */

function _markValidSubpaths(doc, path) {
  if (!doc.$__.validationError) {
    return;
  }

  const keys = Object.keys(doc.$__.validationError.errors);
  for (const key of keys) {
    if (key.startsWith(path + '.')) {
      delete doc.$__.validationError.errors[key];
    }
  }
  if (Object.keys(doc.$__.validationError.errors).length === 0) {
    doc.$__.validationError = null;
  }
}

/*!
 * ignore
 */

function _checkImmutableSubpaths(subdoc, schematype, priorVal) {
  const schema = schematype.schema;
  if (schema == null) {
    return;
  }

  for (const key of Object.keys(schema.paths)) {
    const path = schema.paths[key];
    if (path.$immutableSetter == null) {
      continue;
    }
    const oldVal = priorVal == null ? void 0 : priorVal.$__getValue(key);
    // Calling immutableSetter with `oldVal` even though it expects `newVal`
    // is intentional. That's because `$immutableSetter` compares its param
    // to the current value.
    path.$immutableSetter.call(subdoc, oldVal);
  }
}

/**
 * Saves this document by inserting a new document into the database if [document.isNew](/docs/api.html#document_Document-isNew) is `true`,
 * or sends an [updateOne](/docs/api.html#document_Document-updateOne) operation **only** with the modifications to the database, it does not replace the whole document in the latter case.
 *
 * ####Example:
 *
 *     product.sold = Date.now();
 *     product = await product.save();
 *
 * If save is successful, the returned promise will fulfill with the document
 * saved.
 *
 * ####Example:
 *
 *     const newProduct = await product.save();
 *     newProduct === product; // true
 *
 * @param {Object} [options] options optional options
 * @param {Session} [options.session=null] the [session](https://docs.mongodb.com/manual/reference/server-sessions/) associated with this save operation. If not specified, defaults to the [document's associated session](api.html#document_Document-$session).
 * @param {Object} [options.safe] (DEPRECATED) overrides [schema's safe option](https://mongoosejs.com//docs/guide.html#safe). Use the `w` option instead.
 * @param {Boolean} [options.validateBeforeSave] set to false to save without validating.
 * @param {Boolean} [options.validateModifiedOnly=false] If `true`, Mongoose will only validate modified paths, as opposed to modified paths and `required` paths.
 * @param {Number|String} [options.w] set the [write concern](https://docs.mongodb.com/manual/reference/write-concern/#w-option). Overrides the [schema-level `writeConcern` option](/docs/guide.html#writeConcern)
 * @param {Boolean} [options.j] set to true for MongoDB to wait until this `save()` has been [journaled before resolving the returned promise](https://docs.mongodb.com/manual/reference/write-concern/#j-option). Overrides the [schema-level `writeConcern` option](/docs/guide.html#writeConcern)
 * @param {Number} [options.wtimeout] sets a [timeout for the write concern](https://docs.mongodb.com/manual/reference/write-concern/#wtimeout). Overrides the [schema-level `writeConcern` option](/docs/guide.html#writeConcern).
 * @param {Boolean} [options.checkKeys=true] the MongoDB driver prevents you from saving keys that start with '$' or contain '.' by default. Set this option to `false` to skip that check. See [restrictions on field names](https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names)
 * @param {Boolean} [options.timestamps=true] if `false` and [timestamps](./guide.html#timestamps) are enabled, skip timestamps for this `save()`.
 * @param {Function} [fn] optional callback
 * @method save
 * @memberOf Document
 * @instance
 * @throws {DocumentNotFoundError} if this [save updates an existing document](api.html#document_Document-isNew) but the document doesn't exist in the database. For example, you will get this error if the document is [deleted between when you retrieved the document and when you saved it](documents.html#updating).
 * @return {Promise|undefined} Returns undefined if used with callback or a Promise otherwise.
 * @api public
 * @see middleware https://mongoosejs.com/docs/middleware.html
 */

/**
 * Checks if a path is invalid
 *
 * @param {String|Array<String>} path the field to check
 * @method $isValid
 * @memberOf Document
 * @instance
 * @api private
 */

Document.prototype.$isValid = function(path) {
  if (this.$__.validationError == null || Object.keys(this.$__.validationError.errors).length === 0) {
    return true;
  }
  if (path == null) {
    return false;
  }

  if (path.indexOf(' ') !== -1) {
    path = path.split(' ');
  }
  if (Array.isArray(path)) {
    return path.some(p => this.$__.validationError.errors[p] == null);
  }

  return this.$__.validationError.errors[path] == null;
};

/**
 * Resets the internal modified state of this document.
 *
 * @api private
 * @return {Document}
 * @method $__reset
 * @memberOf Document
 * @instance
 */

Document.prototype.$__reset = function reset() {
  let _this = this;
  DocumentArray || (DocumentArray = require('./types/DocumentArray'));

  this.$__.activePaths
    .map('init', 'modify', function(i) {
      return _this.$__getValue(i);
    })
    .filter(function(val) {
      return val && Array.isArray(val) && utils.isMongooseDocumentArray(val) && val.length;
    })
    .forEach(function(array) {
      let i = array.length;
      while (i--) {
        const doc = array[i];
        if (!doc) {
          continue;
        }
        doc.$__reset();
      }

      _this.$__.activePaths.init(array.$path());

      array[arrayAtomicsBackupSymbol] = array[arrayAtomicsSymbol];
      array[arrayAtomicsSymbol] = {};
    });

  this.$__.activePaths.
    map('init', 'modify', function(i) {
      return _this.$__getValue(i);
    }).
    filter(function(val) {
      return val && !Array.isArray(val) && val.$isSingleNested;
    }).
    forEach(function(doc) {
      doc.$__reset();
      if (doc.$parent() === _this) {
        _this.$__.activePaths.init(doc.$basePath);
      } else if (doc.$parent() != null && doc.$parent().$isSubdocument) {
        // If map path underneath subdocument, may end up with a case where
        // map path is modified but parent still needs to be reset. See gh-10295
        doc.$parent().$__reset();
      }
    });

  // clear atomics
  this.$__dirty().forEach(function(dirt) {
    const type = dirt.value;

    if (type && type[arrayAtomicsSymbol]) {
      type[arrayAtomicsBackupSymbol] = type[arrayAtomicsSymbol];
      type[arrayAtomicsSymbol] = {};
    }
  });

  this.$__.backup = {};
  this.$__.backup.activePaths = {
    modify: Object.assign({}, this.$__.activePaths.states.modify),
    default: Object.assign({}, this.$__.activePaths.states.default)
  };
  this.$__.backup.validationError = this.$__.validationError;
  this.$__.backup.errors = this.$errors;

  // Clear 'dirty' cache
  this.$__.activePaths.clear('modify');
  this.$__.activePaths.clear('default');
  this.$__.validationError = undefined;
  this.$errors = undefined;
  _this = this;
  this.$__schema.requiredPaths().forEach(function(path) {
    _this.$__.activePaths.require(path);
  });

  return this;
};

/*!
 * ignore
 */

Document.prototype.$__undoReset = function $__undoReset() {
  if (this.$__.backup == null || this.$__.backup.activePaths == null) {
    return;
  }

  this.$__.activePaths.states.modify = this.$__.backup.activePaths.modify;
  this.$__.activePaths.states.default = this.$__.backup.activePaths.default;

  this.$__.validationError = this.$__.backup.validationError;
  this.$errors = this.$__.backup.errors;

  for (const dirt of this.$__dirty()) {
    const type = dirt.value;

    if (type && type[arrayAtomicsSymbol] && type[arrayAtomicsBackupSymbol]) {
      type[arrayAtomicsSymbol] = type[arrayAtomicsBackupSymbol];
    }
  }

  for (const subdoc of this.$getAllSubdocs()) {
    subdoc.$__undoReset();
  }
};

/**
 * Returns this documents dirty paths / vals.
 *
 * @api private
 * @method $__dirty
 * @memberOf Document
 * @instance
 */

Document.prototype.$__dirty = function() {
  const _this = this;
  let all = this.$__.activePaths.map('modify', function(path) {
    return {
      path: path,
      value: _this.$__getValue(path),
      schema: _this.$__path(path)
    };
  });
  // gh-2558: if we had to set a default and the value is not undefined,
  // we have to save as well
  all = all.concat(this.$__.activePaths.map('default', function(path) {
    if (path === '_id' || _this.$__getValue(path) == null) {
      return;
    }
    return {
      path: path,
      value: _this.$__getValue(path),
      schema: _this.$__path(path)
    };
  }));

  const allPaths = new Map(all.filter((el) => el != null).map((el) => [el.path, el.value]));
  // Ignore "foo.a" if "foo" is dirty already.
  const minimal = [];

  all.forEach(function(item) {
    if (!item) {
      return;
    }

    let top = null;

    const array = parentPaths(item.path);
    for (let i = 0; i < array.length - 1; i++) {
      if (allPaths.has(array[i])) {
        top = allPaths.get(array[i]);
        break;
      }
    }
    if (top == null) {
      minimal.push(item);
    } else if (top != null &&
        top[arrayAtomicsSymbol] != null &&
        top.hasAtomics()) {
      // special case for top level MongooseArrays
      // the `top` array itself and a sub path of `top` are being set.
      // the only way to honor all of both modifications is through a $set
      // of entire array.
      top[arrayAtomicsSymbol] = {};
      top[arrayAtomicsSymbol].$set = top;
    }
  });
  return minimal;
};

/**
 * Assigns/compiles `schema` into this documents prototype.
 *
 * @param {Schema} schema
 * @api private
 * @method $__setSchema
 * @memberOf Document
 * @instance
 */

Document.prototype.$__setSchema = function(schema) {
  compile(schema.tree, this, undefined, schema.options);

  // Apply default getters if virtual doesn't have any (gh-6262)
  for (const key of Object.keys(schema.virtuals)) {
    schema.virtuals[key]._applyDefaultGetters();
  }
  if (schema.path('schema') == null) {
    this.schema = schema;
  }
  this.$__schema = schema;
  this[documentSchemaSymbol] = schema;
};


/**
 * Get active path that were changed and are arrays
 *
 * @api private
 * @method $__getArrayPathsToValidate
 * @memberOf Document
 * @instance
 */

Document.prototype.$__getArrayPathsToValidate = function() {
  DocumentArray || (DocumentArray = require('./types/DocumentArray'));

  // validate all document arrays.
  return this.$__.activePaths
    .map('init', 'modify', function(i) {
      return this.$__getValue(i);
    }.bind(this))
    .filter(function(val) {
      return val && Array.isArray(val) && utils.isMongooseDocumentArray(val) && val.length;
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
 * @api public
 * @method $getAllSubdocs
 * @memberOf Document
 * @instance
 */

Document.prototype.$getAllSubdocs = function() {
  DocumentArray || (DocumentArray = require('./types/DocumentArray'));
  Embedded = Embedded || require('./types/ArraySubdocument');

  function docReducer(doc, seed, path) {
    let val = doc;
    let isNested = false;
    if (path) {
      if (doc instanceof Document && doc[documentSchemaSymbol].paths[path]) {
        val = doc._doc[path];
      } else if (doc instanceof Document && doc[documentSchemaSymbol].nested[path]) {
        val = doc._doc[path];
        isNested = true;
      } else {
        val = doc[path];
      }
    }
    if (val instanceof Embedded) {
      seed.push(val);
    } else if (val instanceof Map) {
      seed = Array.from(val.keys()).reduce(function(seed, path) {
        return docReducer(val.get(path), seed, null);
      }, seed);
    } else if (val && !Array.isArray(val) && val.$isSingleNested) {
      seed = Object.keys(val._doc).reduce(function(seed, path) {
        return docReducer(val._doc, seed, path);
      }, seed);
      seed.push(val);
    } else if (val && utils.isMongooseDocumentArray(val)) {
      val.forEach(function _docReduce(doc) {
        if (!doc || !doc._doc) {
          return;
        }
        seed = Object.keys(doc._doc).reduce(function(seed, path) {
          return docReducer(doc._doc, seed, path);
        }, seed);
        if (doc instanceof Embedded) {
          seed.push(doc);
        }
      });
    } else if (isNested && val != null) {
      for (const path of Object.keys(val)) {
        docReducer(val, seed, path);
      }
    }
    return seed;
  }

  const subDocs = [];
  for (const path of Object.keys(this._doc)) {
    docReducer(this, subDocs, path);
  }

  return subDocs;
};

/*!
 * Runs queued functions
 */

function applyQueue(doc) {
  const q = doc.$__schema && doc.$__schema.callQueue;
  if (!q.length) {
    return;
  }

  for (const pair of q) {
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
  if (this.$listeners('error').length) {
    this.$emit('error', err);
  } else if (this.constructor.listeners && this.constructor.listeners('error').length) {
    this.constructor.emit('error', err);
  }
};

/**
 * Internal helper for toObject() and toJSON() that doesn't manipulate options
 *
 * @api private
 * @method $toObject
 * @memberOf Document
 * @instance
 */

Document.prototype.$toObject = function(options, json) {
  let defaultOptions = {
    transform: true,
    flattenDecimals: true
  };

  const path = json ? 'toJSON' : 'toObject';
  const baseOptions = this.constructor &&
  this.constructor.base &&
  this.constructor.base.options &&
  get(this.constructor.base.options, path) || {};
  const schemaOptions = this.$__schema && this.$__schema.options || {};
  // merge base default options with Schema's set default options if available.
  // `clone` is necessary here because `utils.options` directly modifies the second input.
  defaultOptions = utils.options(defaultOptions, clone(baseOptions));
  defaultOptions = utils.options(defaultOptions, clone(schemaOptions[path] || {}));

  // If options do not exist or is not an object, set it to empty object
  options = utils.isPOJO(options) ? clone(options) : {};
  options._calledWithOptions = options._calledWithOptions || clone(options);

  let _minimize;
  if (options._calledWithOptions.minimize != null) {
    _minimize = options.minimize;
  } else if (defaultOptions.minimize != null) {
    _minimize = defaultOptions.minimize;
  } else {
    _minimize = schemaOptions.minimize;
  }

  let flattenMaps;
  if (options._calledWithOptions.flattenMaps != null) {
    flattenMaps = options.flattenMaps;
  } else if (defaultOptions.flattenMaps != null) {
    flattenMaps = defaultOptions.flattenMaps;
  } else {
    flattenMaps = schemaOptions.flattenMaps;
  }

  // The original options that will be passed to `clone()`. Important because
  // `clone()` will recursively call `$toObject()` on embedded docs, so we
  // need the original options the user passed in, plus `_isNested` and
  // `_parentOptions` for checking whether we need to depopulate.
  const cloneOptions = Object.assign(utils.clone(options), {
    _isNested: true,
    json: json,
    minimize: _minimize,
    flattenMaps: flattenMaps
  });

  if (utils.hasUserDefinedProperty(options, 'getters')) {
    cloneOptions.getters = options.getters;
  }
  if (utils.hasUserDefinedProperty(options, 'virtuals')) {
    cloneOptions.virtuals = options.virtuals;
  }

  const depopulate = options.depopulate ||
    (options._parentOptions && options._parentOptions.depopulate || false);
  // _isNested will only be true if this is not the top level document, we
  // should never depopulate the top-level document
  if (depopulate && options._isNested && this.$__.wasPopulated) {
    return clone(this.$__.wasPopulated.value || this._id, cloneOptions);
  }

  // merge default options with input options.
  options = utils.options(defaultOptions, options);
  options._isNested = true;
  options.json = json;
  options.minimize = _minimize;

  cloneOptions._parentOptions = options;
  cloneOptions._skipSingleNestedGetters = true;

  const gettersOptions = Object.assign({}, cloneOptions);
  gettersOptions._skipSingleNestedGetters = false;

  // remember the root transform function
  // to save it from being overwritten by sub-transform functions
  const originalTransform = options.transform;

  let ret = clone(this._doc, cloneOptions) || {};

  if (options.getters) {
    applyGetters(this, ret, gettersOptions);

    if (options.minimize) {
      ret = minimize(ret) || {};
    }
  }

  if (options.virtuals || (options.getters && options.virtuals !== false)) {
    applyVirtuals(this, ret, gettersOptions, options);
  }

  if (options.versionKey === false && this.$__schema.options.versionKey) {
    delete ret[this.$__schema.options.versionKey];
  }

  let transform = options.transform;

  // In the case where a subdocument has its own transform function, we need to
  // check and see if the parent has a transform (options.transform) and if the
  // child schema has a transform (this.schema.options.toObject) In this case,
  // we need to adjust options.transform to be the child schema's transform and
  // not the parent schema's
  if (transform) {
    applySchemaTypeTransforms(this, ret);
  }

  if (options.useProjection) {
    omitDeselectedFields(this, ret);
  }

  if (transform === true || (schemaOptions.toObject && transform)) {
    const opts = options.json ? schemaOptions.toJSON : schemaOptions.toObject;

    if (opts) {
      transform = (typeof options.transform === 'function' ? options.transform : opts.transform);
    }
  } else {
    options.transform = originalTransform;
  }

  if (typeof transform === 'function') {
    const xformed = transform(this, ret, options);
    if (typeof xformed !== 'undefined') {
      ret = xformed;
    }
  }

  return ret;
};

/**
 * Converts this document into a plain-old JavaScript object ([POJO](https://masteringjs.io/tutorials/fundamentals/pojo)).
 *
 * Buffers are converted to instances of [mongodb.Binary](https://mongodb.github.com/node-mongodb-native/api-bson-generated/binary.html) for proper storage.
 *
 * ####Options:
 *
 * - `getters` apply all getters (path and virtual getters), defaults to false
 * - `aliases` apply all aliases if `virtuals=true`, defaults to true
 * - `virtuals` apply virtual getters (can override `getters` option), defaults to false
 * - `minimize` remove empty objects, defaults to true
 * - `transform` a transform function to apply to the resulting document before returning
 * - `depopulate` depopulate any populated paths, replacing them with their original refs, defaults to false
 * - `versionKey` whether to include the version key, defaults to true
 * - `flattenMaps` convert Maps to POJOs. Useful if you want to JSON.stringify() the result of toObject(), defaults to false
 * - `useProjection` set to `true` to omit fields that are excluded in this document's projection. Unless you specified a projection, this will omit any field that has `select: false` in the schema.
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
 *     const doc = new Doc({ _id: 'anId', secret: 47, name: 'Wreck-it Ralph' });
 *     doc.toObject();                                        // { secret: 47, name: 'Wreck-it Ralph' }
 *     doc.toObject({ hide: 'secret _id', transform: false });// { _id: 'anId', secret: 47, name: 'Wreck-it Ralph' }
 *     doc.toObject({ hide: 'secret _id', transform: true }); // { name: 'Wreck-it Ralph' }
 *
 * If you pass a transform in `toObject()` options, Mongoose will apply the transform
 * to [subdocuments](/docs/subdocs.html) in addition to the top-level document.
 * Similarly, `transform: false` skips transforms for all subdocuments.
 * Note that this behavior is different for transforms defined in the schema:
 * if you define a transform in `schema.options.toObject.transform`, that transform
 * will **not** apply to subdocuments.
 *
 *     const memberSchema = new Schema({ name: String, email: String });
 *     const groupSchema = new Schema({ members: [memberSchema], name: String, email });
 *     const Group = mongoose.model('Group', groupSchema);
 *
 *     const doc = new Group({
 *       name: 'Engineering',
 *       email: 'dev@mongoosejs.io',
 *       members: [{ name: 'Val', email: 'val@mongoosejs.io' }]
 *     });
 *
 *     // Removes `email` from both top-level document **and** array elements
 *     // { name: 'Engineering', members: [{ name: 'Val' }] }
 *     doc.toObject({ transform: (doc, ret) => { delete ret.email; return ret; } });
 *
 * Transforms, like all of these options, are also available for `toJSON`. See [this guide to `JSON.stringify()`](https://thecodebarbarian.com/the-80-20-guide-to-json-stringify-in-javascript.html) to learn why `toJSON()` and `toObject()` are separate functions.
 *
 * See [schema options](/docs/guide.html#toObject) for some more details.
 *
 * _During save, no custom options are applied to the document before being sent to the database._
 *
 * @param {Object} [options]
 * @param {Boolean} [options.getters=false] if true, apply all getters, including virtuals
 * @param {Boolean} [options.virtuals=false] if true, apply virtuals, including aliases. Use `{ getters: true, virtuals: false }` to just apply getters, not virtuals
 * @param {Boolean} [options.aliases=true] if `options.virtuals = true`, you can set `options.aliases = false` to skip applying aliases. This option is a no-op if `options.virtuals = false`.
 * @param {Boolean} [options.minimize=true] if true, omit any empty objects from the output
 * @param {Function|null} [options.transform=null] if set, mongoose will call this function to allow you to transform the returned object
 * @param {Boolean} [options.depopulate=false] if true, replace any conventionally populated paths with the original id in the output. Has no affect on virtual populated paths.
 * @param {Boolean} [options.versionKey=true] if false, exclude the version key (`__v` by default) from the output
 * @param {Boolean} [options.flattenMaps=false] if true, convert Maps to POJOs. Useful if you want to `JSON.stringify()` the result of `toObject()`.
 * @param {Boolean} [options.useProjection=false] - If true, omits fields that are excluded in this document's projection. Unless you specified a projection, this will omit any field that has `select: false` in the schema.
 * @return {Object} js object
 * @see mongodb.Binary https://mongodb.github.com/node-mongodb-native/api-bson-generated/binary.html
 * @api public
 * @memberOf Document
 * @instance
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
  const keys = Object.keys(obj);
  let i = keys.length;
  let hasKeys;
  let key;
  let val;

  while (i--) {
    key = keys[i];
    val = obj[key];

    if (utils.isPOJO(val)) {
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
 */

function applyVirtuals(self, json, options, toObjectOptions) {
  const schema = self.$__schema;
  const paths = Object.keys(schema.virtuals);
  let i = paths.length;
  const numPaths = i;
  let path;
  let assignPath;
  let cur = self._doc;
  let v;
  const aliases = typeof (toObjectOptions && toObjectOptions.aliases) === 'boolean'
    ? toObjectOptions.aliases
    : true;

  let virtualsToApply = null;
  if (Array.isArray(options.virtuals)) {
    virtualsToApply = new Set(options.virtuals);
  }
  else if (options.virtuals && options.virtuals.pathsToSkip) {
    virtualsToApply = new Set(paths);
    for (let i = 0; i < options.virtuals.pathsToSkip.length; i++) {
      if (virtualsToApply.has(options.virtuals.pathsToSkip[i])) {
        virtualsToApply.delete(options.virtuals.pathsToSkip[i]);
      }
    }
  }

  if (!cur) {
    return json;
  }

  options = options || {};
  for (i = 0; i < numPaths; ++i) {
    path = paths[i];

    if (virtualsToApply != null && !virtualsToApply.has(path)) {
      continue;
    }

    // Allow skipping aliases with `toObject({ virtuals: true, aliases: false })`
    if (!aliases && schema.aliases.hasOwnProperty(path)) {
      continue;
    }

    // We may be applying virtuals to a nested object, for example if calling
    // `doc.nestedProp.toJSON()`. If so, the path we assign to, `assignPath`,
    // will be a trailing substring of the `path`.
    assignPath = path;
    if (options.path != null) {
      if (!path.startsWith(options.path + '.')) {
        continue;
      }
      assignPath = path.substring(options.path.length + 1);
    }
    const parts = assignPath.split('.');
    v = clone(self.get(path), options);
    if (v === void 0) {
      continue;
    }
    const plen = parts.length;
    cur = json;
    for (let j = 0; j < plen - 1; ++j) {
      cur[parts[j]] = cur[parts[j]] || {};
      cur = cur[parts[j]];
    }
    cur[parts[plen - 1]] = v;
  }

  return json;
}


/*!
 * Applies virtuals properties to `json`.
 *
 * @param {Document} self
 * @param {Object} json
 * @return {Object} `json`
 */

function applyGetters(self, json, options) {
  const schema = self.$__schema;
  const paths = Object.keys(schema.paths);
  let i = paths.length;
  let path;
  let cur = self._doc;
  let v;

  if (!cur) {
    return json;
  }

  while (i--) {
    path = paths[i];

    const parts = path.split('.');
    const plen = parts.length;
    const last = plen - 1;
    let branch = json;
    let part;
    cur = self._doc;

    if (!self.$__isSelected(path)) {
      continue;
    }

    for (let ii = 0; ii < plen; ++ii) {
      part = parts[ii];
      v = cur[part];
      if (ii === last) {
        const val = self.$get(path);
        branch[part] = clone(val, options);
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

/*!
 * Applies schema type transforms to `json`.
 *
 * @param {Document} self
 * @param {Object} json
 * @return {Object} `json`
 */

function applySchemaTypeTransforms(self, json) {
  const schema = self.$__schema;
  const paths = Object.keys(schema.paths || {});
  const cur = self._doc;

  if (!cur) {
    return json;
  }

  for (const path of paths) {
    const schematype = schema.paths[path];
    if (typeof schematype.options.transform === 'function') {
      const val = self.$get(path);
      const transformedValue = schematype.options.transform.call(self, val);
      throwErrorIfPromise(path, transformedValue);
      utils.setValue(path, transformedValue, json);
    } else if (schematype.$embeddedSchemaType != null &&
        typeof schematype.$embeddedSchemaType.options.transform === 'function') {
      const vals = [].concat(self.$get(path));
      const transform = schematype.$embeddedSchemaType.options.transform;
      for (let i = 0; i < vals.length; ++i) {
        const transformedValue = transform.call(self, vals[i]);
        vals[i] = transformedValue;
        throwErrorIfPromise(path, transformedValue);
      }

      json[path] = vals;
    }
  }

  return json;
}

function throwErrorIfPromise(path, transformedValue) {
  if (isPromise(transformedValue)) {
    throw new Error('`transform` function must be synchronous, but the transform on path `' + path + '` returned a promise.');
  }
}

/*!
 * ignore
 */

function omitDeselectedFields(self, json) {
  const schema = self.$__schema;
  const paths = Object.keys(schema.paths || {});
  const cur = self._doc;

  if (!cur) {
    return json;
  }

  let selected = self.$__.selected;
  if (selected === void 0) {
    selected = {};
    queryhelpers.applyPaths(selected, schema);
  }
  if (selected == null || Object.keys(selected).length === 0) {
    return json;
  }

  for (const path of paths) {
    if (selected[path] != null && !selected[path]) {
      delete json[path];
    }
  }

  return json;
}

/**
 * The return value of this method is used in calls to [`JSON.stringify(doc)`](https://thecodebarbarian.com/the-80-20-guide-to-json-stringify-in-javascript#the-tojson-function).
 *
 * This method accepts the same options as [Document#toObject](#document_Document-toObject). To apply the options to every document of your schema by default, set your [schemas](#schema_Schema) `toJSON` option to the same argument.
 *
 *     schema.set('toJSON', { virtuals: true });
 *
 * There is one difference between `toJSON()` and `toObject()` options.
 * When you call `toJSON()`, the [`flattenMaps` option](./document.html#document_Document-toObject) defaults to `true`, because `JSON.stringify()` doesn't convert maps to objects by default.
 * When you call `toObject()`, the `flattenMaps` option is `false` by default.
 *
 * See [schema options](/docs/guide.html#toJSON) for more information on setting `toJSON` option defaults.
 *
 * @param {Object} options
 * @param {Boolean} [options.flattenMaps=true] if true, convert Maps to [POJOs](https://masteringjs.io/tutorials/fundamentals/pojo). Useful if you want to `JSON.stringify()` the result.
 * @return {Object}
 * @see Document#toObject #document_Document-toObject
 * @see JSON.stringify() in JavaScript https://thecodebarbarian.com/the-80-20-guide-to-json-stringify-in-javascript.html
 * @api public
 * @memberOf Document
 * @instance
 */

Document.prototype.toJSON = function(options) {
  return this.$toObject(options, true);
};


Document.prototype.ownerDocument = function() {
  return this;
};


/**
 * If this document is a subdocument or populated document, returns the document's
 * parent. Returns the original document if there is no parent.
 *
 * @api public
 * @method parent
 * @memberOf Document
 * @instance
 */

Document.prototype.parent = function() {
  if (this.$isSubdocument || this.$__.wasPopulated) {
    return this.$__.parent;
  }
  return this;
};

/**
 * Alias for `parent()`. If this document is a subdocument or populated
 * document, returns the document's parent. Returns `undefined` otherwise.
 *
 * @api public
 * @method $parent
 * @memberOf Document
 * @instance
 */

Document.prototype.$parent = Document.prototype.parent;

/**
 * Helper for console.log
 *
 * @api public
 * @method inspect
 * @memberOf Document
 * @instance
 */

Document.prototype.inspect = function(options) {
  const isPOJO = utils.isPOJO(options);
  let opts;
  if (isPOJO) {
    opts = options;
    opts.minimize = false;
  }
  const ret = this.toObject(opts);

  if (ret == null) {
    // If `toObject()` returns null, `this` is still an object, so if `inspect()`
    // prints out null this can cause some serious confusion. See gh-7942.
    return 'MongooseDocument { ' + ret + ' }';
  }

  return ret;
};

if (inspect.custom) {
  /*!
  * Avoid Node deprecation warning DEP0079
  */

  Document.prototype[inspect.custom] = Document.prototype.inspect;
}

/**
 * Helper for console.log
 *
 * @api public
 * @method toString
 * @memberOf Document
 * @instance
 */

Document.prototype.toString = function() {
  const ret = this.inspect();
  if (typeof ret === 'string') {
    return ret;
  }
  return inspect(ret);
};

/**
 * Returns true if this document is equal to another document.
 *
 * Documents are considered equal when they have matching `_id`s, unless neither
 * document has an `_id`, in which case this function falls back to using
 * `deepEqual()`.
 *
 * @param {Document} doc a document to compare
 * @return {Boolean}
 * @api public
 * @memberOf Document
 * @instance
 */

Document.prototype.equals = function(doc) {
  if (!doc) {
    return false;
  }

  const tid = this.$__getValue('_id');
  const docid = doc.$__ != null ? doc.$__getValue('_id') : doc;
  if (!tid && !docid) {
    return deepEqual(this, doc);
  }
  return tid && tid.equals
    ? tid.equals(docid)
    : tid === docid;
};

/**
 * Populates paths on an existing document.
 *
 * ####Example:
 *
 *     await doc.populate([
 *       'stories',
 *       { path: 'fans', sort: { name: -1 } }
 *     ]);
 *     doc.populated('stories'); // Array of ObjectIds
 *     doc.stories[0].title; // 'Casino Royale'
 *     doc.populated('fans'); // Array of ObjectIds
 *
 *     await doc.populate('fans', '-email');
 *     doc.fans[0].email // not populated
 *
 *     await doc.populate('author fans', '-email');
 *     doc.author.email // not populated
 *     doc.fans[0].email // not populated
 *
 * @param {String|Object|Array} path either the path to populate or an object specifying all parameters, or either an array of those
 * @param {Object|String} [select] Field selection for the population query
 * @param {Model} [model] The model you wish to use for population. If not specified, populate will look up the model by the name in the Schema's `ref` field.
 * @param {Object} [match] Conditions for the population query
 * @param {Object} [options] Options for the population query (sort, etc)
 * @param {String} [options.path=null] The path to populate.
 * @param {string|PopulateOptions} [options.populate=null] Recursively populate paths in the populated documents. See [deep populate docs](/docs/populate.html#deep-populate).
 * @param {boolean} [options.retainNullValues=false] by default, Mongoose removes null and undefined values from populated arrays. Use this option to make `populate()` retain `null` and `undefined` array entries.
 * @param {boolean} [options.getters=false] if true, Mongoose will call any getters defined on the `localField`. By default, Mongoose gets the raw value of `localField`. For example, you would need to set this option to `true` if you wanted to [add a `lowercase` getter to your `localField`](/docs/schematypes.html#schematype-options).
 * @param {boolean} [options.clone=false] When you do `BlogPost.find().populate('author')`, blog posts with the same author will share 1 copy of an `author` doc. Enable this option to make Mongoose clone populated docs before assigning them.
 * @param {Object|Function} [options.match=null] Add an additional filter to the populate query. Can be a filter object containing [MongoDB query syntax](https://docs.mongodb.com/manual/tutorial/query-documents/), or a function that returns a filter object.
 * @param {Function} [options.transform=null] Function that Mongoose will call on every populated document that allows you to transform the populated document.
 * @param {Object} [options.options=null] Additional options like `limit` and `lean`.
 * @param {Function} [callback] Callback
 * @see population ./populate.html
 * @see Query#select #query_Query-select
 * @see Model.populate #model_Model.populate
 * @memberOf Document
 * @instance
 * @return {Promise|null}
 * @api public
 */

Document.prototype.populate = function populate() {
  const pop = {};
  const args = [...arguments];
  let fn;

  if (args.length !== 0) {
    if (typeof args[args.length - 1] === 'function') {
      fn = args.pop();
    }

    // use hash to remove duplicate paths
    const res = utils.populate.apply(null, args);
    for (const populateOptions of res) {
      pop[populateOptions.path] = populateOptions;
    }
  }

  const paths = utils.object.vals(pop);
  let topLevelModel = this.constructor;
  if (this.$__isNested) {
    topLevelModel = this.$__[scopeSymbol].constructor;
    const nestedPath = this.$__.nestedPath;
    paths.forEach(function(populateOptions) {
      populateOptions.path = nestedPath + '.' + populateOptions.path;
    });
  }

  // Use `$session()` by default if the document has an associated session
  // See gh-6754
  if (this.$session() != null) {
    const session = this.$session();
    paths.forEach(path => {
      if (path.options == null) {
        path.options = { session: session };
        return;
      }
      if (!('session' in path.options)) {
        path.options.session = session;
      }
    });
  }

  paths.forEach(p => {
    p._localModel = topLevelModel;
  });

  return topLevelModel.populate(this, paths, fn);
};

/**
 * Gets all populated documents associated with this document.
 *
 * @api public
 * @return {Array<Document>} array of populated documents. Empty array if there are no populated documents associated with this document.
 * @memberOf Document
 * @instance
 */
Document.prototype.$getPopulatedDocs = function $getPopulatedDocs() {
  let keys = [];
  if (this.$__.populated != null) {
    keys = keys.concat(Object.keys(this.$__.populated));
  }
  let result = [];
  for (const key of keys) {
    const value = this.$get(key);
    if (Array.isArray(value)) {
      result = result.concat(value);
    } else if (value instanceof Document) {
      result.push(value);
    }
  }
  return result;
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
 * If the path was not populated, returns `undefined`.
 *
 * @param {String} path
 * @return {Array|ObjectId|Number|Buffer|String|undefined}
 * @memberOf Document
 * @instance
 * @api public
 */

Document.prototype.populated = function(path, val, options) {
  // val and options are internal
  if (val == null || val === true) {
    if (!this.$__.populated) {
      return undefined;
    }
    if (typeof path !== 'string') {
      return undefined;
    }

    // Map paths can be populated with either `path.$*` or just `path`
    const _path = path.endsWith('.$*') ? path.replace(/\.\$\*$/, '') : path;

    const v = this.$__.populated[_path];
    if (v) {
      return val === true ? v : v.value;
    }
    return undefined;
  }

  this.$__.populated || (this.$__.populated = {});
  this.$__.populated[path] = { value: val, options: options };

  // If this was a nested populate, make sure each populated doc knows
  // about its populated children (gh-7685)
  const pieces = path.split('.');
  for (let i = 0; i < pieces.length - 1; ++i) {
    const subpath = pieces.slice(0, i + 1).join('.');
    const subdoc = this.$get(subpath);
    if (subdoc != null && subdoc.$__ != null && this.$populated(subpath)) {
      const rest = pieces.slice(i + 1).join('.');
      subdoc.$populated(rest, val, options);
      // No need to continue because the above recursion should take care of
      // marking the rest of the docs as populated
      break;
    }
  }

  return val;
};

Document.prototype.$populated = Document.prototype.populated;

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
 * If the path was not provided, then all populated fields are returned to their unpopulated state.
 *
 * @param {String} path
 * @return {Document} this
 * @see Document.populate #document_Document-populate
 * @api public
 * @memberOf Document
 * @instance
 */

Document.prototype.depopulate = function(path) {
  if (typeof path === 'string') {
    path = path.indexOf(' ') === -1 ? [path] : path.split(' ');
  }

  let populatedIds;
  const virtualKeys = this.$$populatedVirtuals ? Object.keys(this.$$populatedVirtuals) : [];
  const populated = this.$__ && this.$__.populated || {};

  if (arguments.length === 0) {
    // Depopulate all
    for (const virtualKey of virtualKeys) {
      delete this.$$populatedVirtuals[virtualKey];
      delete this._doc[virtualKey];
      delete populated[virtualKey];
    }

    const keys = Object.keys(populated);

    for (const key of keys) {
      populatedIds = this.$populated(key);
      if (!populatedIds) {
        continue;
      }
      delete populated[key];
      utils.setValue(key, populatedIds, this._doc);
    }
    return this;
  }

  for (const singlePath of path) {
    populatedIds = this.$populated(singlePath);
    delete populated[singlePath];

    if (virtualKeys.indexOf(singlePath) !== -1) {
      delete this.$$populatedVirtuals[singlePath];
      delete this._doc[singlePath];
    } else if (populatedIds) {
      utils.setValue(singlePath, populatedIds, this._doc);
    }
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
 * @instance
 */

Document.prototype.$__fullPath = function(path) {
  // overridden in SubDocuments
  return path || '';
};

/**
 * Returns the changes that happened to the document
 * in the format that will be sent to MongoDB.
 *
 * #### Example:
 *
 *     const userSchema = new Schema({
 *       name: String,
 *       age: Number,
 *       country: String
 *     });
 *     const User = mongoose.model('User', userSchema);
 *     const user = await User.create({
 *       name: 'Hafez',
 *       age: 25,
 *       country: 'Egypt'
 *     });
 *
 *     // returns an empty object, no changes happened yet
 *     user.getChanges(); // { }
 *
 *     user.country = undefined;
 *     user.age = 26;
 *
 *     user.getChanges(); // { $set: { age: 26 }, { $unset: { country: 1 } } }
 *
 *     await user.save();
 *
 *     user.getChanges(); // { }
 *
 * Modifying the object that `getChanges()` returns does not affect the document's
 * change tracking state. Even if you `delete user.getChanges().$set`, Mongoose
 * will still send a `$set` to the server.
 *
 * @return {Object}
 * @api public
 * @method getChanges
 * @memberOf Document
 * @instance
 */

Document.prototype.getChanges = function() {
  const delta = this.$__delta();
  const changes = delta ? delta[1] : {};
  return changes;
};

/*!
 * Module exports.
 */

Document.ValidationError = ValidationError;
module.exports = exports = Document;
