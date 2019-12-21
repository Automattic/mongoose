'use strict';

/*!
 * Module dependencies.
 */

const Aggregate = require('./aggregate');
const ChangeStream = require('./cursor/ChangeStream');
const Document = require('./document');
const DocumentNotFoundError = require('./error/notFound');
const DivergentArrayError = require('./error/divergentArray');
const EventEmitter = require('events').EventEmitter;
const MongooseBuffer = require('./types/buffer');
const MongooseError = require('./error/index');
const OverwriteModelError = require('./error/overwriteModel');
const PromiseProvider = require('./promise_provider');
const Query = require('./query');
const RemoveOptions = require('./options/removeOptions');
const SaveOptions = require('./options/saveOptions');
const Schema = require('./schema');
const TimeoutError = require('./error/timeout');
const ValidationError = require('./error/validation');
const VersionError = require('./error/version');
const ParallelSaveError = require('./error/parallelSave');
const applyQueryMiddleware = require('./helpers/query/applyQueryMiddleware');
const applyHooks = require('./helpers/model/applyHooks');
const applyMethods = require('./helpers/model/applyMethods');
const applyStaticHooks = require('./helpers/model/applyStaticHooks');
const applyStatics = require('./helpers/model/applyStatics');
const applyWriteConcern = require('./helpers/schema/applyWriteConcern');
const assignVals = require('./helpers/populate/assignVals');
const castBulkWrite = require('./helpers/model/castBulkWrite');
const discriminator = require('./helpers/model/discriminator');
const each = require('./helpers/each');
const getDiscriminatorByValue = require('./helpers/discriminator/getDiscriminatorByValue');
const getModelsMapForPopulate = require('./helpers/populate/getModelsMapForPopulate');
const immediate = require('./helpers/immediate');
const internalToObjectOptions = require('./options').internalToObjectOptions;
const isPathSelectedInclusive = require('./helpers/projection/isPathSelectedInclusive');
const get = require('./helpers/get');
const leanPopulateMap = require('./helpers/populate/leanPopulateMap');
const modifiedPaths = require('./helpers/update/modifiedPaths');
const parallelLimit = require('./helpers/parallelLimit');
const util = require('util');
const utils = require('./utils');

const VERSION_WHERE = 1;
const VERSION_INC = 2;
const VERSION_ALL = VERSION_WHERE | VERSION_INC;

const arrayAtomicsSymbol = require('./helpers/symbols').arrayAtomicsSymbol;
const modelCollectionSymbol = Symbol('mongoose#Model#collection');
const modelDbSymbol = Symbol('mongoose#Model#db');
const modelSymbol = require('./helpers/symbols').modelSymbol;
const subclassedSymbol = Symbol('mongoose#Model#subclassed');

const saveToObjectOptions = Object.assign({}, internalToObjectOptions, {
  bson: true
});

/**
 * A Model is a class that's your primary tool for interacting with MongoDB.
 * An instance of a Model is called a [Document](./api.html#Document).
 *
 * In Mongoose, the term "Model" refers to subclasses of the `mongoose.Model`
 * class. You should not use the `mongoose.Model` class directly. The
 * [`mongoose.model()`](./api.html#mongoose_Mongoose-model) and
 * [`connection.model()`](./api.html#connection_Connection-model) functions
 * create subclasses of `mongoose.Model` as shown below.
 *
 * ####Example:
 *
 *     // `UserModel` is a "Model", a subclass of `mongoose.Model`.
 *     const UserModel = mongoose.model('User', new Schema({ name: String }));
 *
 *     // You can use a Model to create new documents using `new`:
 *     const userDoc = new UserModel({ name: 'Foo' });
 *     await userDoc.save();
 *
 *     // You also use a model to create queries:
 *     const userFromDb = await UserModel.findOne({ name: 'Foo' });
 *
 * @param {Object} doc values for initial set
 * @param [fields] optional object containing the fields that were selected in the query which returned this document. You do **not** need to set this parameter to ensure Mongoose handles your [query projection](./api.html#query_Query-select).
 * @inherits Document http://mongoosejs.com/docs/api.html#document-js
 * @event `error`: If listening to this event, 'error' is emitted when a document was saved without passing a callback and an `error` occurred. If not listening, the event bubbles to the connection used to create this Model.
 * @event `index`: Emitted after `Model#ensureIndexes` completes. If an error occurred it is passed with the event.
 * @event `index-single-start`: Emitted when an individual index starts within `Model#ensureIndexes`. The fields and options being used to build the index are also passed with the event.
 * @event `index-single-done`: Emitted when an individual index finishes within `Model#ensureIndexes`. If an error occurred it is passed with the event. The fields, options, and index name are also passed.
 * @api public
 */

function Model(doc, fields, skipId) {
  if (fields instanceof Schema) {
    throw new TypeError('2nd argument to `Model` must be a POJO or string, ' +
      '**not** a schema. Make sure you\'re calling `mongoose.model()`, not ' +
      '`mongoose.Model()`.');
  }
  Document.call(this, doc, fields, skipId);
}

/*!
 * Inherits from Document.
 *
 * All Model.prototype features are available on
 * top level (non-sub) documents.
 */

Model.prototype.__proto__ = Document.prototype;
Model.prototype.$isMongooseModelPrototype = true;

/**
 * Connection the model uses.
 *
 * @api public
 * @property db
 * @memberOf Model
 * @instance
 */

Model.prototype.db;

/**
 * Collection the model uses.
 *
 * This property is read-only. Modifying this property is a no-op.
 *
 * @api public
 * @property collection
 * @memberOf Model
 * @instance
 */

Model.prototype.collection;

/**
 * The name of the model
 *
 * @api public
 * @property modelName
 * @memberOf Model
 * @instance
 */

Model.prototype.modelName;

/**
 * Additional properties to attach to the query when calling `save()` and
 * `isNew` is false.
 *
 * @api public
 * @property $where
 * @memberOf Model
 * @instance
 */

Model.prototype.$where;

/**
 * If this is a discriminator model, `baseModelName` is the name of
 * the base model.
 *
 * @api public
 * @property baseModelName
 * @memberOf Model
 * @instance
 */

Model.prototype.baseModelName;

/**
 * Event emitter that reports any errors that occurred. Useful for global error
 * handling.
 *
 * ####Example:
 *
 *     MyModel.events.on('error', err => console.log(err.message));
 *
 *     // Prints a 'CastError' because of the above handler
 *     await MyModel.findOne({ _id: 'notanid' }).catch(noop);
 *
 * @api public
 * @fires error whenever any query or model function errors
 * @memberOf Model
 * @static events
 */

Model.events;

/*!
 * Compiled middleware for this model. Set in `applyHooks()`.
 *
 * @api private
 * @property _middleware
 * @memberOf Model
 * @static
 */

Model._middleware;

/*!
 * ignore
 */

function _applyCustomWhere(doc, where) {
  if (doc.$where == null) {
    return;
  }

  const keys = Object.keys(doc.$where);
  const len = keys.length;
  for (let i = 0; i < len; ++i) {
    where[keys[i]] = doc.$where[keys[i]];
  }
}

/*!
 * ignore
 */

Model.prototype.$__handleSave = function(options, callback) {
  const _this = this;
  let saveOptions = {};

  if ('safe' in options) {
    _handleSafe(options);
  }
  applyWriteConcern(this.schema, options);
  if ('w' in options) {
    saveOptions.w = options.w;
  }
  if ('j' in options) {
    saveOptions.j = options.j;
  }
  if ('wtimeout' in options) {
    saveOptions.wtimeout = options.wtimeout;
  }
  if ('checkKeys' in options) {
    saveOptions.checkKeys = options.checkKeys;
  }

  const session = this.$session();
  if (!saveOptions.hasOwnProperty('session')) {
    saveOptions.session = session;
  }

  if (Object.keys(saveOptions).length === 0) {
    saveOptions = null;
  }

  if (this.isNew) {
    // send entire doc
    const obj = this.toObject(saveToObjectOptions);

    if ((obj || {})._id === void 0) {
      // documents must have an _id else mongoose won't know
      // what to update later if more changes are made. the user
      // wouldn't know what _id was generated by mongodb either
      // nor would the ObjectId generated by mongodb necessarily
      // match the schema definition.
      setTimeout(function() {
        callback(new MongooseError('document must have an _id before saving'));
      }, 0);
      return;
    }

    this.$__version(true, obj);
    this[modelCollectionSymbol].insertOne(obj, saveOptions, function(err, ret) {
      if (err) {
        _setIsNew(_this, true);

        callback(err, null);
        return;
      }

      callback(null, ret);
    });
    this.$__reset();
    _setIsNew(this, false);
    // Make it possible to retry the insert
    this.$__.inserting = true;
  } else {
    // Make sure we don't treat it as a new object on error,
    // since it already exists
    this.$__.inserting = false;

    const delta = this.$__delta();

    if (delta) {
      if (delta instanceof MongooseError) {
        callback(delta);
        return;
      }

      const where = this.$__where(delta[0]);
      if (where instanceof MongooseError) {
        callback(where);
        return;
      }

      _applyCustomWhere(this, where);

      this[modelCollectionSymbol].updateOne(where, delta[1], saveOptions, function(err, ret) {
        if (err) {
          callback(err);
          return;
        }
        ret.$where = where;
        callback(null, ret);
      });
    } else {
      this.constructor.exists(this.$__where())
        .then((documentExists)=>{
          if (!documentExists) throw new DocumentNotFoundError(this.$__where(),this.constructor.modelName);

          this.$__reset();
          callback();
        })
        .catch(callback);
      return;
    }

    _setIsNew(this, false);
  }
};

/*!
 * ignore
 */

Model.prototype.$__save = function(options, callback) {
  this.$__handleSave(options, (error, result) => {
    const hooks = this.schema.s.hooks;
    if (error) {
      return hooks.execPost('save:error', this, [this], { error: error }, (error) => {
        callback(error, this);
      });
    }

    // store the modified paths before the document is reset
    const modifiedPaths = this.modifiedPaths();

    this.$__reset();

    let numAffected = 0;
    if (get(options, 'safe.w') !== 0 && get(options, 'w') !== 0) {
      // Skip checking if write succeeded if writeConcern is set to
      // unacknowledged writes, because otherwise `numAffected` will always be 0
      if (result) {
        if (Array.isArray(result)) {
          numAffected = result.length;
        } else if (result.result && result.result.n !== undefined) {
          numAffected = result.result.n;
        } else if (result.result && result.result.nModified !== undefined) {
          numAffected = result.result.nModified;
        } else {
          numAffected = result;
        }
      }

      // was this an update that required a version bump?
      if (this.$__.version && !this.$__.inserting) {
        const doIncrement = VERSION_INC === (VERSION_INC & this.$__.version);
        this.$__.version = undefined;

        const key = this.schema.options.versionKey;
        const version = this.$__getValue(key) || 0;

        if (numAffected <= 0) {
          // the update failed. pass an error back
          const err = this.$__.$versionError ||
            new VersionError(this, version, modifiedPaths);
          return callback(err);
        }

        // increment version if was successful
        if (doIncrement) {
          this.$__setValue(key, version + 1);
        }
      }

      if (result != null && numAffected <= 0) {
        error = new DocumentNotFoundError(result.$where,
          this.constructor.modelName, numAffected, result);
        return hooks.execPost('save:error', this, [this], { error: error }, (error) => {
          callback(error, this);
        });
      }
    }
    this.$__.saving = undefined;
    this.emit('save', this, numAffected);
    this.constructor.emit('save', this, numAffected);
    callback(null, this);
  });
};

/*!
 * ignore
 */

function generateVersionError(doc, modifiedPaths) {
  const key = doc.schema.options.versionKey;
  if (!key) {
    return null;
  }
  const version = doc.$__getValue(key) || 0;
  return new VersionError(doc, version, modifiedPaths);
}

/**
 * Saves this document.
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
 * @param {Object} [options.safe] (DEPRECATED) overrides [schema's safe option](http://mongoosejs.com//docs/guide.html#safe). Use the `w` option instead.
 * @param {Boolean} [options.validateBeforeSave] set to false to save without validating.
 * @param {Number|String} [options.w] set the [write concern](https://docs.mongodb.com/manual/reference/write-concern/#w-option). Overrides the [schema-level `writeConcern` option](/docs/guide.html#writeConcern)
 * @param {Boolean} [options.j] set to true for MongoDB to wait until this `save()` has been [journaled before resolving the returned promise](https://docs.mongodb.com/manual/reference/write-concern/#j-option). Overrides the [schema-level `writeConcern` option](/docs/guide.html#writeConcern)
 * @param {Number} [options.wtimeout] sets a [timeout for the write concern](https://docs.mongodb.com/manual/reference/write-concern/#wtimeout). Overrides the [schema-level `writeConcern` option](/docs/guide.html#writeConcern).
 * @param {Boolean} [options.checkKeys=true] the MongoDB driver prevents you from saving keys that start with '$' or contain '.' by default. Set this option to `false` to skip that check. See [restrictions on field names](https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names)
 * @param {Boolean} [options.timestamps=true] if `false` and [timestamps](./guide.html#timestamps) are enabled, skip timestamps for this `save()`.
 * @param {Function} [fn] optional callback
 * @throws {DocumentNotFoundError} if this [save updates an existing document](api.html#document_Document-isNew) but the document doesn't exist in the database. For example, you will get this error if the document is [deleted between when you retrieved the document and when you saved it](documents.html#updating).
 * @return {Promise|undefined} Returns undefined if used with callback or a Promise otherwise.
 * @api public
 * @see middleware http://mongoosejs.com/docs/middleware.html
 */

Model.prototype.save = function(options, fn) {
  let parallelSave;

  if (this.$__.saving) {
    parallelSave = new ParallelSaveError(this);
  } else {
    this.$__.saving = new ParallelSaveError(this);
  }

  if (typeof options === 'function') {
    fn = options;
    options = undefined;
  }

  options = new SaveOptions(options);
  if (options.hasOwnProperty('session')) {
    this.$session(options.session);
  }

  this.$__.$versionError = generateVersionError(this, this.modifiedPaths());

  fn = this.constructor.$handleCallbackError(fn);

  return utils.promiseOrCallback(fn, cb => {
    cb = this.constructor.$wrapCallback(cb);

    if (parallelSave) {
      this.$__handleReject(parallelSave);
      return cb(parallelSave);
    }

    this.$__.saveOptions = options;

    this.$__save(options, error => {
      this.$__.saving = undefined;
      delete this.$__.saveOptions;
      delete this.$__.$versionError;

      if (error) {
        this.$__handleReject(error);
        return cb(error);
      }
      cb(null, this);
    });
  }, this.constructor.events);
};

/*!
 * Determines whether versioning should be skipped for the given path
 *
 * @param {Document} self
 * @param {String} path
 * @return {Boolean} true if versioning should be skipped for the given path
 */
function shouldSkipVersioning(self, path) {
  const skipVersioning = self.schema.options.skipVersioning;
  if (!skipVersioning) return false;

  // Remove any array indexes from the path
  path = path.replace(/\.\d+\./, '.');

  return skipVersioning[path];
}

/*!
 * Apply the operation to the delta (update) clause as
 * well as track versioning for our where clause.
 *
 * @param {Document} self
 * @param {Object} where
 * @param {Object} delta
 * @param {Object} data
 * @param {Mixed} val
 * @param {String} [operation]
 */

function operand(self, where, delta, data, val, op) {
  // delta
  op || (op = '$set');
  if (!delta[op]) delta[op] = {};
  delta[op][data.path] = val;

  // disabled versioning?
  if (self.schema.options.versionKey === false) return;

  // path excluded from versioning?
  if (shouldSkipVersioning(self, data.path)) return;

  // already marked for versioning?
  if (VERSION_ALL === (VERSION_ALL & self.$__.version)) return;

  switch (op) {
    case '$set':
    case '$unset':
    case '$pop':
    case '$pull':
    case '$pullAll':
    case '$push':
    case '$addToSet':
      break;
    default:
      // nothing to do
      return;
  }

  // ensure updates sent with positional notation are
  // editing the correct array element.
  // only increment the version if an array position changes.
  // modifying elements of an array is ok if position does not change.
  if (op === '$push' || op === '$addToSet' || op === '$pullAll' || op === '$pull') {
    self.$__.version = VERSION_INC;
  } else if (/^\$p/.test(op)) {
    // potentially changing array positions
    self.increment();
  } else if (Array.isArray(val)) {
    // $set an array
    self.increment();
  } else if (/\.\d+\.|\.\d+$/.test(data.path)) {
    // now handling $set, $unset
    // subpath of array
    self.$__.version = VERSION_WHERE;
  }
}

/*!
 * Compiles an update and where clause for a `val` with _atomics.
 *
 * @param {Document} self
 * @param {Object} where
 * @param {Object} delta
 * @param {Object} data
 * @param {Array} value
 */

function handleAtomics(self, where, delta, data, value) {
  if (delta.$set && delta.$set[data.path]) {
    // $set has precedence over other atomics
    return;
  }

  if (typeof value.$__getAtomics === 'function') {
    value.$__getAtomics().forEach(function(atomic) {
      const op = atomic[0];
      const val = atomic[1];
      operand(self, where, delta, data, val, op);
    });
    return;
  }

  // legacy support for plugins

  const atomics = value[arrayAtomicsSymbol];
  const ops = Object.keys(atomics);
  let i = ops.length;
  let val;
  let op;

  if (i === 0) {
    // $set

    if (utils.isMongooseObject(value)) {
      value = value.toObject({depopulate: 1, _isNested: true});
    } else if (value.valueOf) {
      value = value.valueOf();
    }

    return operand(self, where, delta, data, value);
  }

  function iter(mem) {
    return utils.isMongooseObject(mem)
      ? mem.toObject({depopulate: 1, _isNested: true})
      : mem;
  }

  while (i--) {
    op = ops[i];
    val = atomics[op];

    if (utils.isMongooseObject(val)) {
      val = val.toObject({depopulate: true, transform: false, _isNested: true});
    } else if (Array.isArray(val)) {
      val = val.map(iter);
    } else if (val.valueOf) {
      val = val.valueOf();
    }

    if (op === '$addToSet') {
      val = {$each: val};
    }

    operand(self, where, delta, data, val, op);
  }
}

/**
 * Produces a special query document of the modified properties used in updates.
 *
 * @api private
 * @method $__delta
 * @memberOf Model
 * @instance
 */

Model.prototype.$__delta = function() {
  const dirty = this.$__dirty();
  if (!dirty.length && VERSION_ALL !== this.$__.version) {
    return;
  }

  const where = {};
  const delta = {};
  const len = dirty.length;
  const divergent = [];
  let d = 0;

  where._id = this._doc._id;
  // If `_id` is an object, need to depopulate, but also need to be careful
  // because `_id` can technically be null (see gh-6406)
  if (get(where, '_id.$__', null) != null) {
    where._id = where._id.toObject({ transform: false, depopulate: true });
  }

  for (; d < len; ++d) {
    const data = dirty[d];
    let value = data.value;

    const match = checkDivergentArray(this, data.path, value);
    if (match) {
      divergent.push(match);
      continue;
    }

    const pop = this.populated(data.path, true);
    if (!pop && this.$__.selected) {
      // If any array was selected using an $elemMatch projection, we alter the path and where clause
      // NOTE: MongoDB only supports projected $elemMatch on top level array.
      const pathSplit = data.path.split('.');
      const top = pathSplit[0];
      if (this.$__.selected[top] && this.$__.selected[top].$elemMatch) {
        // If the selected array entry was modified
        if (pathSplit.length > 1 && pathSplit[1] == 0 && typeof where[top] === 'undefined') {
          where[top] = this.$__.selected[top];
          pathSplit[1] = '$';
          data.path = pathSplit.join('.');
        }
        // if the selected array was modified in any other way throw an error
        else {
          divergent.push(data.path);
          continue;
        }
      }
    }

    if (divergent.length) continue;

    if (value === undefined) {
      operand(this, where, delta, data, 1, '$unset');
    } else if (value === null) {
      operand(this, where, delta, data, null);
    } else if (value.isMongooseArray && value.$path() && value[arrayAtomicsSymbol]) {
      // arrays and other custom types (support plugins etc)
      handleAtomics(this, where, delta, data, value);
    } else if (value[MongooseBuffer.pathSymbol] && Buffer.isBuffer(value)) {
      // MongooseBuffer
      value = value.toObject();
      operand(this, where, delta, data, value);
    } else {
      value = utils.clone(value, {
        depopulate: true,
        transform: false,
        virtuals: false,
        getters: false,
        _isNested: true
      });
      operand(this, where, delta, data, value);
    }
  }

  if (divergent.length) {
    return new DivergentArrayError(divergent);
  }

  if (this.$__.version) {
    this.$__version(where, delta);
  }

  return [where, delta];
};

/*!
 * Determine if array was populated with some form of filter and is now
 * being updated in a manner which could overwrite data unintentionally.
 *
 * @see https://github.com/Automattic/mongoose/issues/1334
 * @param {Document} doc
 * @param {String} path
 * @return {String|undefined}
 */

function checkDivergentArray(doc, path, array) {
  // see if we populated this path
  const pop = doc.populated(path, true);

  if (!pop && doc.$__.selected) {
    // If any array was selected using an $elemMatch projection, we deny the update.
    // NOTE: MongoDB only supports projected $elemMatch on top level array.
    const top = path.split('.')[0];
    if (doc.$__.selected[top + '.$']) {
      return top;
    }
  }

  if (!(pop && array && array.isMongooseArray)) return;

  // If the array was populated using options that prevented all
  // documents from being returned (match, skip, limit) or they
  // deselected the _id field, $pop and $set of the array are
  // not safe operations. If _id was deselected, we do not know
  // how to remove elements. $pop will pop off the _id from the end
  // of the array in the db which is not guaranteed to be the
  // same as the last element we have here. $set of the entire array
  // would be similarily destructive as we never received all
  // elements of the array and potentially would overwrite data.
  const check = pop.options.match ||
      pop.options.options && utils.object.hasOwnProperty(pop.options.options, 'limit') || // 0 is not permitted
      pop.options.options && pop.options.options.skip || // 0 is permitted
      pop.options.select && // deselected _id?
      (pop.options.select._id === 0 ||
      /\s?-_id\s?/.test(pop.options.select));

  if (check) {
    const atomics = array[arrayAtomicsSymbol];
    if (Object.keys(atomics).length === 0 || atomics.$set || atomics.$pop) {
      return path;
    }
  }
}

/**
 * Appends versioning to the where and update clauses.
 *
 * @api private
 * @method $__version
 * @memberOf Model
 * @instance
 */

Model.prototype.$__version = function(where, delta) {
  const key = this.schema.options.versionKey;

  if (where === true) {
    // this is an insert
    if (key) this.$__setValue(key, delta[key] = 0);
    return;
  }

  // updates

  // only apply versioning if our versionKey was selected. else
  // there is no way to select the correct version. we could fail
  // fast here and force them to include the versionKey but
  // thats a bit intrusive. can we do this automatically?
  if (!this.isSelected(key)) {
    return;
  }

  // $push $addToSet don't need the where clause set
  if (VERSION_WHERE === (VERSION_WHERE & this.$__.version)) {
    const value = this.$__getValue(key);
    if (value != null) where[key] = value;
  }

  if (VERSION_INC === (VERSION_INC & this.$__.version)) {
    if (get(delta.$set, key, null) != null) {
      // Version key is getting set, means we'll increment the doc's version
      // after a successful save, so we should set the incremented version so
      // future saves don't fail (gh-5779)
      ++delta.$set[key];
    } else {
      delta.$inc = delta.$inc || {};
      delta.$inc[key] = 1;
    }
  }
};

/**
 * Signal that we desire an increment of this documents version.
 *
 * ####Example:
 *
 *     Model.findById(id, function (err, doc) {
 *       doc.increment();
 *       doc.save(function (err) { .. })
 *     })
 *
 * @see versionKeys http://mongoosejs.com/docs/guide.html#versionKey
 * @api public
 */

Model.prototype.increment = function increment() {
  this.$__.version = VERSION_ALL;
  return this;
};

/**
 * Returns a query object
 *
 * @api private
 * @method $__where
 * @memberOf Model
 * @instance
 */

Model.prototype.$__where = function _where(where) {
  where || (where = {});

  if (!where._id) {
    where._id = this._doc._id;
  }

  if (this._doc._id === void 0) {
    return new MongooseError('No _id found on document!');
  }

  return where;
};

/**
 * Removes this document from the db.
 *
 * ####Example:
 *     product.remove(function (err, product) {
 *       if (err) return handleError(err);
 *       Product.findById(product._id, function (err, product) {
 *         console.log(product) // null
 *       })
 *     })
 *
 *
 * As an extra measure of flow control, remove will return a Promise (bound to `fn` if passed) so it could be chained, or hooked to recieve errors
 *
 * ####Example:
 *     product.remove().then(function (product) {
 *        ...
 *     }).catch(function (err) {
 *        assert.ok(err)
 *     })
 *
 * @param {Object} [options]
 * @param {Session} [options.session=null] the [session](https://docs.mongodb.com/manual/reference/server-sessions/) associated with this operation. If not specified, defaults to the [document's associated session](api.html#document_Document-$session).
 * @param {function(err,product)} [fn] optional callback
 * @return {Promise} Promise
 * @api public
 */

Model.prototype.remove = function remove(options, fn) {
  if (typeof options === 'function') {
    fn = options;
    options = undefined;
  }

  options = new RemoveOptions(options);
  if (options.hasOwnProperty('session')) {
    this.$session(options.session);
  }

  fn = this.constructor.$handleCallbackError(fn);

  return utils.promiseOrCallback(fn, cb => {
    cb = this.constructor.$wrapCallback(cb);
    this.$__remove(options, cb);
  }, this.constructor.events);
};

/**
 * Alias for remove
 */

Model.prototype.delete = Model.prototype.remove;

/**
 * Removes this document from the db. Equivalent to `.remove()`.
 *
 * ####Example:
 *     product = await product.deleteOne();
 *     await Product.findById(product._id); // null
 *
 * @param {function(err,product)} [fn] optional callback
 * @return {Promise} Promise
 * @api public
 */

Model.prototype.deleteOne = function deleteOne(options, fn) {
  if (typeof options === 'function') {
    fn = options;
    options = undefined;
  }

  if (!options) {
    options = {};
  }

  fn = this.constructor.$handleCallbackError(fn);

  return utils.promiseOrCallback(fn, cb => {
    cb = this.constructor.$wrapCallback(cb);
    this.$__deleteOne(options, cb);
  }, this.constructor.events);
};

/*!
 * ignore
 */

Model.prototype.$__remove = function $__remove(options, cb) {
  if (this.$__.isDeleted) {
    return immediate(() => cb(null, this));
  }

  const where = this.$__where();
  if (where instanceof MongooseError) {
    return cb(where);
  }

  _applyCustomWhere(this, where);

  const session = this.$session();
  if (!options.hasOwnProperty('session')) {
    options.session = session;
  }

  this[modelCollectionSymbol].deleteOne(where, options, err => {
    if (!err) {
      this.$__.isDeleted = true;
      this.emit('remove', this);
      this.constructor.emit('remove', this);
      return cb(null, this);
    }
    this.$__.isDeleted = false;
    cb(err);
  });
};

/*!
 * ignore
 */

Model.prototype.$__deleteOne = Model.prototype.$__remove;

/**
 * Returns another Model instance.
 *
 * ####Example:
 *
 *     var doc = new Tank;
 *     doc.model('User').findById(id, callback);
 *
 * @param {String} name model name
 * @api public
 */

Model.prototype.model = function model(name) {
  return this[modelDbSymbol].model(name);
};

/**
 * Returns true if at least one document exists in the database that matches
 * the given `filter`, and false otherwise.
 *
 * Under the hood, `MyModel.exists({ answer: 42 })` is equivalent to
 * `MyModel.findOne({ answer: 42 }).select({ _id: 1 }).lean().then(doc => !!doc)`
 *
 * ####Example:
 *     await Character.deleteMany({});
 *     await Character.create({ name: 'Jean-Luc Picard' });
 *
 *     await Character.exists({ name: /picard/i }); // true
 *     await Character.exists({ name: /riker/i }); // false
 *
 * This function triggers the following middleware.
 *
 * - `findOne()`
 *
 * @param {Object} filter
 * @param {Function} [callback] callback
 * @return {Promise}
 */

Model.exists = function exists(filter, options, callback) {
  _checkContext(this, 'exists');

  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  const query = this.findOne(filter).
    select({ _id: 1 }).
    lean().
    setOptions(options);

  if (typeof callback === 'function') {
    query.exec(function(err, doc) {
      if (err != null) {
        return callback(err);
      }
      callback(null, !!doc);
    });
    return;
  }

  return query.then(doc => !!doc);
};

/**
 * Adds a discriminator type.
 *
 * ####Example:
 *
 *     function BaseSchema() {
 *       Schema.apply(this, arguments);
 *
 *       this.add({
 *         name: String,
 *         createdAt: Date
 *       });
 *     }
 *     util.inherits(BaseSchema, Schema);
 *
 *     var PersonSchema = new BaseSchema();
 *     var BossSchema = new BaseSchema({ department: String });
 *
 *     var Person = mongoose.model('Person', PersonSchema);
 *     var Boss = Person.discriminator('Boss', BossSchema);
 *     new Boss().__t; // "Boss". `__t` is the default `discriminatorKey`
 *
 *     var employeeSchema = new Schema({ boss: ObjectId });
 *     var Employee = Person.discriminator('Employee', employeeSchema, 'staff');
 *     new Employee().__t; // "staff" because of 3rd argument above
 *
 * @param {String} name discriminator model name
 * @param {Schema} schema discriminator model schema
 * @param {String} [value] the string stored in the `discriminatorKey` property. If not specified, Mongoose uses the `name` parameter.
 * @return {Model} The newly created discriminator model
 * @api public
 */

Model.discriminator = function(name, schema, value) {
  let model;
  if (typeof name === 'function') {
    model = name;
    name = utils.getFunctionName(model);
    if (!(model.prototype instanceof Model)) {
      throw new MongooseError('The provided class ' + name + ' must extend Model');
    }
  }

  _checkContext(this, 'discriminator');

  schema = discriminator(this, name, schema, value, true);
  if (this.db.models[name]) {
    throw new OverwriteModelError(name);
  }

  schema.$isRootDiscriminator = true;
  schema.$globalPluginsApplied = true;

  model = this.db.model(model || name, schema, this.collection.name);
  this.discriminators[name] = model;
  const d = this.discriminators[name];
  d.prototype.__proto__ = this.prototype;
  Object.defineProperty(d, 'baseModelName', {
    value: this.modelName,
    configurable: true,
    writable: false
  });

  // apply methods and statics
  applyMethods(d, schema);
  applyStatics(d, schema);

  if (this[subclassedSymbol] != null) {
    for (const submodel of this[subclassedSymbol]) {
      submodel.discriminators = submodel.discriminators || {};
      submodel.discriminators[name] =
        model.__subclass(model.db, schema, submodel.collection.name);
    }
  }

  return d;
};

/*!
 * Make sure `this` is a model
 */

function _checkContext(ctx, fnName) {
  // Check context, because it is easy to mistakenly type
  // `new Model.discriminator()` and get an incomprehensible error
  if (ctx == null || ctx === global) {
    throw new MongooseError('`Model.' + fnName + '()` cannot run without a ' +
      'model as `this`. Make sure you are calling `MyModel.' + fnName + '()` ' +
      'where `MyModel` is a Mongoose model.');
  } else if (ctx[modelSymbol] == null) {
    throw new MongooseError('`Model.' + fnName + '()` cannot run without a ' +
      'model as `this`. Make sure you are not calling ' +
      '`new Model.' + fnName + '()`');
  }
}

// Model (class) features

/*!
 * Give the constructor the ability to emit events.
 */

for (const i in EventEmitter.prototype) {
  Model[i] = EventEmitter.prototype[i];
}

/**
 * This function is responsible for building [indexes](https://docs.mongodb.com/manual/indexes/),
 * unless [`autoIndex`](http://mongoosejs.com/docs/guide.html#autoIndex) is turned off.
 *
 * Mongoose calls this function automatically when a model is created using
 * [`mongoose.model()`](/docs/api.html#mongoose_Mongoose-model) or
 * [`connection.model()`](/docs/api.html#connection_Connection-model), so you
 * don't need to call it. This function is also idempotent, so you may call it
 * to get back a promise that will resolve when your indexes are finished
 * building as an alternative to [`MyModel.on('index')`](/docs/guide.html#indexes)
 *
 * ####Example:
 *
 *     var eventSchema = new Schema({ thing: { type: 'string', unique: true }})
 *     // This calls `Event.init()` implicitly, so you don't need to call
 *     // `Event.init()` on your own.
 *     var Event = mongoose.model('Event', eventSchema);
 *
 *     Event.init().then(function(Event) {
 *       // You can also use `Event.on('index')` if you prefer event emitters
 *       // over promises.
 *       console.log('Indexes are done building!');
 *     });
 *
 * @api public
 * @param {Function} [callback]
 * @returns {Promise}
 */

Model.init = function init(callback) {
  _checkContext(this, 'init');

  this.schema.emit('init', this);

  if (this.$init != null) {
    if (callback) {
      this.$init.then(() => callback(), err => callback(err));
      return null;
    }
    return this.$init;
  }

  const Promise = PromiseProvider.get();
  const autoIndex = utils.getOption('autoIndex',
    this.schema.options, this.db.config, this.db.base.options);
  const autoCreate = this.schema.options.autoCreate == null ?
    this.db.config.autoCreate :
    this.schema.options.autoCreate;

  const _ensureIndexes = autoIndex ?
    cb => this.ensureIndexes({ _automatic: true }, cb) :
    cb => cb();
  const _createCollection = autoCreate ?
    cb => this.createCollection({}, cb) :
    cb => cb();

  this.$init = new Promise((resolve, reject) => {
    _createCollection(error => {
      if (error) {
        return reject(error);
      }
      _ensureIndexes(error => {
        if (error) {
          return reject(error);
        }
        resolve(this);
      });
    });
  });

  if (callback) {
    this.$init.then(() => callback(), err => callback(err));
    this.$caught = true;
    return null;
  } else {
    const _catch = this.$init.catch;
    const _this = this;
    this.$init.catch = function() {
      this.$caught = true;
      return _catch.apply(_this.$init, arguments);
    };
  }

  return this.$init;
};


/**
 * Create the collection for this model. By default, if no indexes are specified,
 * mongoose will not create the collection for the model until any documents are
 * created. Use this method to create the collection explicitly.
 *
 * Note 1: You may need to call this before starting a transaction
 * See https://docs.mongodb.com/manual/core/transactions/#transactions-and-operations
 *
 * Note 2: You don't have to call this if your schema contains index or unique field.
 * In that case, just use `Model.init()`
 *
 * ####Example:
 *
 *     var userSchema = new Schema({ name: String })
 *     var User = mongoose.model('User', userSchema);
 *
 *     User.createCollection().then(function(collection) {
 *       console.log('Collection is created!');
 *     });
 *
 * @api public
 * @param {Object} [options] see [MongoDB driver docs](http://mongodb.github.io/node-mongodb-native/3.1/api/Db.html#createCollection)
 * @param {Function} [callback]
 * @returns {Promise}
 */

Model.createCollection = function createCollection(options, callback) {
  _checkContext(this, 'createCollection');

  if (typeof options === 'string') {
    throw new MongooseError('You can\'t specify a new collection name in Model.createCollection.' +
      'This is not like Connection.createCollection. Only options are accepted here.');
  } else if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  const schemaCollation = get(this, 'schema.options.collation', null);
  if (schemaCollation != null) {
    options = Object.assign({ collation: schemaCollation }, options);
  }

  callback = this.$handleCallbackError(callback);

  return utils.promiseOrCallback(callback, cb => {
    cb = this.$wrapCallback(cb);

    this.db.createCollection(this.collection.collectionName, options, utils.tick((error) => {
      if (error) {
        return cb(error);
      }
      this.collection = this.db.collection(this.collection.collectionName, options);
      cb(null, this.collection);
    }));
  }, this.events);
};

/**
 * Makes the indexes in MongoDB match the indexes defined in this model's
 * schema. This function will drop any indexes that are not defined in
 * the model's schema except the `_id` index, and build any indexes that
 * are in your schema but not in MongoDB.
 *
 * See the [introductory blog post](http://thecodebarbarian.com/whats-new-in-mongoose-5-2-syncindexes)
 * for more information.
 *
 * ####Example:
 *
 *     const schema = new Schema({ name: { type: String, unique: true } });
 *     const Customer = mongoose.model('Customer', schema);
 *     await Customer.createIndex({ age: 1 }); // Index is not in schema
 *     // Will drop the 'age' index and create an index on `name`
 *     await Customer.syncIndexes();
 *
 * @param {Object} [options] options to pass to `ensureIndexes()`
 * @param {Function} [callback] optional callback
 * @return {Promise|undefined} Returns `undefined` if callback is specified, returns a promise if no callback.
 * @api public
 */

Model.syncIndexes = function syncIndexes(options, callback) {
  _checkContext(this, 'syncIndexes');

  callback = this.$handleCallbackError(callback);

  return utils.promiseOrCallback(callback, cb => {
    cb = this.$wrapCallback(cb);

    this.createCollection(err => {
      if (err) {
        return cb(err);
      }
      this.cleanIndexes((err, dropped) => {
        if (err != null) {
          return cb(err);
        }
        this.createIndexes(options, err => {
          if (err != null) {
            return cb(err);
          }
          cb(null, dropped);
        });
      });
    });
  }, this.events);
};

/**
 * Deletes all indexes that aren't defined in this model's schema. Used by
 * `syncIndexes()`.
 *
 * The returned promise resolves to a list of the dropped indexes' names as an array
 *
 * @param {Function} [callback] optional callback
 * @return {Promise|undefined} Returns `undefined` if callback is specified, returns a promise if no callback.
 * @api public
 */

Model.cleanIndexes = function cleanIndexes(callback) {
  _checkContext(this, 'cleanIndexes');

  callback = this.$handleCallbackError(callback);

  return utils.promiseOrCallback(callback, cb => {
    const collection = this.collection;

    this.listIndexes((err, indexes) => {
      if (err != null) {
        return cb(err);
      }

      const schemaIndexes = this.schema.indexes();
      const toDrop = [];

      for (const index of indexes) {
        let found = false;
        // Never try to drop `_id` index, MongoDB server doesn't allow it
        if (index.key._id) {
          continue;
        }

        for (const schemaIndex of schemaIndexes) {
          if (isIndexEqual(this, schemaIndex, index)) {
            found = true;
          }
        }

        if (!found) {
          toDrop.push(index.name);
        }
      }

      if (toDrop.length === 0) {
        return cb(null, []);
      }

      dropIndexes(toDrop, cb);
    });

    function dropIndexes(toDrop, cb) {
      let remaining = toDrop.length;
      let error = false;
      toDrop.forEach(indexName => {
        collection.dropIndex(indexName, err => {
          if (err != null) {
            error = true;
            return cb(err);
          }
          if (!error) {
            --remaining || cb(null, toDrop);
          }
        });
      });
    }
  });
};

/*!
 * ignore
 */

function isIndexEqual(model, schemaIndex, dbIndex) {
  const key = schemaIndex[0];
  const options = _decorateDiscriminatorIndexOptions(model,
    utils.clone(schemaIndex[1]));

  // If these options are different, need to rebuild the index
  const optionKeys = ['unique', 'partialFilterExpression', 'sparse', 'expireAfterSeconds'];
  for (const key of optionKeys) {
    if (!(key in options) && !(key in dbIndex)) {
      continue;
    }
    if (!utils.deepEqual(options[key], dbIndex[key])) {
      return false;
    }
  }

  const schemaIndexKeys = Object.keys(key);
  const dbIndexKeys = Object.keys(dbIndex.key);
  if (schemaIndexKeys.length !== dbIndexKeys.length) {
    return false;
  }
  for (let i = 0; i < schemaIndexKeys.length; ++i) {
    if (schemaIndexKeys[i] !== dbIndexKeys[i]) {
      return false;
    }
    if (!utils.deepEqual(key[schemaIndexKeys[i]], dbIndex.key[dbIndexKeys[i]])) {
      return false;
    }
  }

  return true;
}

/**
 * Lists the indexes currently defined in MongoDB. This may or may not be
 * the same as the indexes defined in your schema depending on whether you
 * use the [`autoIndex` option](/docs/guide.html#autoIndex) and if you
 * build indexes manually.
 *
 * @param {Function} [cb] optional callback
 * @return {Promise|undefined} Returns `undefined` if callback is specified, returns a promise if no callback.
 * @api public
 */

Model.listIndexes = function init(callback) {
  _checkContext(this, 'listIndexes');

  const _listIndexes = cb => {
    this.collection.listIndexes().toArray(cb);
  };

  callback = this.$handleCallbackError(callback);

  return utils.promiseOrCallback(callback, cb => {
    cb = this.$wrapCallback(cb);

    // Buffering
    if (this.collection.buffer) {
      this.collection.addQueue(_listIndexes, [cb]);
    } else {
      _listIndexes(cb);
    }
  }, this.events);
};

/**
 * Sends `createIndex` commands to mongo for each index declared in the schema.
 * The `createIndex` commands are sent in series.
 *
 * ####Example:
 *
 *     Event.ensureIndexes(function (err) {
 *       if (err) return handleError(err);
 *     });
 *
 * After completion, an `index` event is emitted on this `Model` passing an error if one occurred.
 *
 * ####Example:
 *
 *     var eventSchema = new Schema({ thing: { type: 'string', unique: true }})
 *     var Event = mongoose.model('Event', eventSchema);
 *
 *     Event.on('index', function (err) {
 *       if (err) console.error(err); // error occurred during index creation
 *     })
 *
 * _NOTE: It is not recommended that you run this in production. Index creation may impact database performance depending on your load. Use with caution._
 *
 * @param {Object} [options] internal options
 * @param {Function} [cb] optional callback
 * @return {Promise}
 * @api public
 */

Model.ensureIndexes = function ensureIndexes(options, callback) {
  _checkContext(this, 'ensureIndexes');

  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  callback = this.$handleCallbackError(callback);

  return utils.promiseOrCallback(callback, cb => {
    cb = this.$wrapCallback(cb);

    _ensureIndexes(this, options || {}, error => {
      if (error) {
        return cb(error);
      }
      cb(null);
    });
  }, this.events);
};

/**
 * Similar to `ensureIndexes()`, except for it uses the [`createIndex`](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#createIndex)
 * function.
 *
 * @param {Object} [options] internal options
 * @param {Function} [cb] optional callback
 * @return {Promise}
 * @api public
 */

Model.createIndexes = function createIndexes(options, callback) {
  _checkContext(this, 'createIndexes');

  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  options.createIndex = true;
  return this.ensureIndexes(options, callback);
};

/*!
 * ignore
 */

function _ensureIndexes(model, options, callback) {
  const indexes = model.schema.indexes();
  let indexError;

  options = options || {};

  const done = function(err) {
    if (err && !model.$caught) {
      model.emit('error', err);
    }
    model.emit('index', err || indexError);
    callback && callback(err);
  };

  for (const index of indexes) {
    const keys = Object.keys(index[0]);
    if (keys.length === 1 && keys[0] === '_id' && index[0]._id !== 'hashed') {
      console.warn('mongoose: Cannot specify a custom index on `_id` for ' +
        'model name "' + model.modelName + '", ' +
        'MongoDB does not allow overwriting the default `_id` index. See ' +
        'http://bit.ly/mongodb-id-index');
    }
  }

  if (!indexes.length) {
    immediate(function() {
      done();
    });
    return;
  }
  // Indexes are created one-by-one to support how MongoDB < 2.4 deals
  // with background indexes.

  const indexSingleDone = function(err, fields, options, name) {
    model.emit('index-single-done', err, fields, options, name);
  };
  const indexSingleStart = function(fields, options) {
    model.emit('index-single-start', fields, options);
  };

  const baseSchema = model.schema._baseSchema;
  const baseSchemaIndexes = baseSchema ? baseSchema.indexes() : [];

  const create = function() {
    if (options._automatic) {
      if (model.schema.options.autoIndex === false ||
          (model.schema.options.autoIndex == null && model.db.config.autoIndex === false)) {
        return done();
      }
    }

    const index = indexes.shift();
    if (!index) {
      return done();
    }

    if (baseSchemaIndexes.find(i => utils.deepEqual(i, index))) {
      return create();
    }

    const indexFields = utils.clone(index[0]);
    const indexOptions = utils.clone(index[1]);

    _decorateDiscriminatorIndexOptions(model, indexOptions);
    if ('safe' in options) {
      _handleSafe(options);
    }
    applyWriteConcern(model.schema, indexOptions);

    indexSingleStart(indexFields, options);
    let useCreateIndex = !!model.base.options.useCreateIndex;
    if ('useCreateIndex' in model.db.config) {
      useCreateIndex = !!model.db.config.useCreateIndex;
    }
    if ('createIndex' in options) {
      useCreateIndex = !!options.createIndex;
    }

    const methodName = useCreateIndex ? 'createIndex' : 'ensureIndex';
    model.collection[methodName](indexFields, indexOptions, utils.tick(function(err, name) {
      indexSingleDone(err, indexFields, indexOptions, name);
      if (err) {
        if (!indexError) {
          indexError = err;
        }
        if (!model.$caught) {
          model.emit('error', err);
        }
      }
      create();
    }));
  };

  immediate(function() {
    // If buffering is off, do this manually.
    if (options._automatic && !model.collection.collection) {
      model.collection.addQueue(create, []);
    } else {
      create();
    }
  });
}

function _decorateDiscriminatorIndexOptions(model, indexOptions) {
  // If the model is a discriminator and it has a unique index, add a
  // partialFilterExpression by default so the unique index will only apply
  // to that discriminator.
  if (model.baseModelName != null && indexOptions.unique &&
      !('partialFilterExpression' in indexOptions) &&
      !('sparse' in indexOptions)) {

    const value = (
      model.schema.discriminatorMapping &&
      model.schema.discriminatorMapping.value
    ) || model.modelName;

    indexOptions.partialFilterExpression = {
      [model.schema.options.discriminatorKey]: value
    };
  }
  return indexOptions;
}

const safeDeprecationWarning = 'Mongoose: the `safe` option for `save()` is ' +
  'deprecated. Use the `w` option instead: http://bit.ly/mongoose-save';

const _handleSafe = util.deprecate(function _handleSafe(options) {
  if (options.safe) {
    if (typeof options.safe === 'boolean') {
      options.w = options.safe;
      delete options.safe;
    }
    if (typeof options.safe === 'object') {
      options.w = options.safe.w;
      options.j = options.safe.j;
      options.wtimeout = options.safe.wtimeout;
      delete options.safe;
    }
  }
}, safeDeprecationWarning);

/**
 * Schema the model uses.
 *
 * @property schema
 * @receiver Model
 * @api public
 * @memberOf Model
 */

Model.schema;

/*!
 * Connection instance the model uses.
 *
 * @property db
 * @api public
 * @memberOf Model
 */

Model.db;

/*!
 * Collection the model uses.
 *
 * @property collection
 * @api public
 * @memberOf Model
 */

Model.collection;

/**
 * Base Mongoose instance the model uses.
 *
 * @property base
 * @api public
 * @memberOf Model
 */

Model.base;

/**
 * Registered discriminators for this model.
 *
 * @property discriminators
 * @api public
 * @memberOf Model
 */

Model.discriminators;

/**
 * Translate any aliases fields/conditions so the final query or document object is pure
 *
 * ####Example:
 *
 *     Character
 *       .find(Character.translateAliases({
 *         '名': 'Eddard Stark' // Alias for 'name'
 *       })
 *       .exec(function(err, characters) {})
 *
 * ####Note:
 * Only translate arguments of object type anything else is returned raw
 *
 * @param {Object} raw fields/conditions that may contain aliased keys
 * @return {Object} the translated 'pure' fields/conditions
 */
Model.translateAliases = function translateAliases(fields) {
  _checkContext(this, 'translateAliases');

  const translate = (key, value) => {
    let alias;
    const translated = [];
    const fieldKeys = key.split('.');
    let currentSchema = this.schema;
    for (const i in fieldKeys) {
      const name = fieldKeys[i];
      if (currentSchema && currentSchema.aliases[name]) {
        alias = currentSchema.aliases[name];
        // Alias found,
        translated.push(alias);
      } else {
        // Alias not found, so treat as un-aliased key
        translated.push(name);
      }

      // Check if aliased path is a schema
      if (currentSchema && currentSchema.paths[alias]) {
        currentSchema = currentSchema.paths[alias].schema;
      }
      else
        currentSchema = null;
    }

    const translatedKey = translated.join('.');
    if (fields instanceof Map)
      fields.set(translatedKey, value);
    else
      fields[translatedKey] = value;

    if (translatedKey !== key) {
      // We'll be using the translated key instead
      if (fields instanceof Map) {
        // Delete from map
        fields.delete(key);
      } else {
        // Delete from object
        delete fields[key]; // We'll be using the translated key instead
      }
    }
    return fields;
  };

  if (typeof fields === 'object') {
    // Fields is an object (query conditions or document fields)
    if (fields instanceof Map) {
      // A Map was supplied
      for (const field of new Map(fields)) {
        fields = translate(field[0], field[1]);
      }
    } else {
      // Infer a regular object was supplied
      for (const key of Object.keys(fields)) {
        fields = translate(key, fields[key]);
        if (key[0] === '$') {
          if (Array.isArray(fields[key])) {
            for (const i in fields[key]) {
              // Recursively translate nested queries
              fields[key][i] = this.translateAliases(fields[key][i]);
            }
          }
        }
      }
    }

    return fields;
  } else {
    // Don't know typeof fields
    return fields;
  }
};

/**
 * Removes all documents that match `conditions` from the collection.
 * To remove just the first document that matches `conditions`, set the `single`
 * option to true.
 *
 * ####Example:
 *
 *     const res = await Character.remove({ name: 'Eddard Stark' });
 *     res.deletedCount; // Number of documents removed
 *
 * ####Note:
 *
 * This method sends a remove command directly to MongoDB, no Mongoose documents
 * are involved. Because no Mongoose documents are involved, Mongoose does
 * not execute [document middleware](/docs/middleware.html#types-of-middleware).
 *
 * @param {Object} conditions
 * @param {Object} [options]
 * @param {Session} [options.session=null] the [session](https://docs.mongodb.com/manual/reference/server-sessions/) associated with this operation.
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.remove = function remove(conditions, options, callback) {
  _checkContext(this, 'remove');

  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
    options = null;
  } else if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  // get the mongodb collection object
  const mq = new this.Query({}, {}, this, this.collection);
  mq.setOptions(options);

  callback = this.$handleCallbackError(callback);

  return mq.remove(conditions, callback);
};

/**
 * Deletes the first document that matches `conditions` from the collection.
 * Behaves like `remove()`, but deletes at most one document regardless of the
 * `single` option.
 *
 * ####Example:
 *
 *     Character.deleteOne({ name: 'Eddard Stark' }, function (err) {});
 *
 * ####Note:
 *
 * Like `Model.remove()`, this function does **not** trigger `pre('remove')` or `post('remove')` hooks.
 *
 * @param {Object} conditions
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.deleteOne = function deleteOne(conditions, options, callback) {
  _checkContext(this, 'deleteOne');

  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
    options = null;
  }
  else if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  const mq = new this.Query(conditions, {}, this, this.collection);
  mq.setOptions(options);

  callback = this.$handleCallbackError(callback);

  return mq.deleteOne(callback);
};

/**
 * Deletes all of the documents that match `conditions` from the collection.
 * Behaves like `remove()`, but deletes all documents that match `conditions`
 * regardless of the `single` option.
 *
 * ####Example:
 *
 *     Character.deleteMany({ name: /Stark/, age: { $gte: 18 } }, function (err) {});
 *
 * ####Note:
 *
 * Like `Model.remove()`, this function does **not** trigger `pre('remove')` or `post('remove')` hooks.
 *
 * @param {Object} conditions
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.deleteMany = function deleteMany(conditions, options, callback) {
  _checkContext(this, 'deleteMany');

  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
    options = null;
  } else if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  const mq = new this.Query(conditions, {}, this, this.collection);
  mq.setOptions(options);

  callback = this.$handleCallbackError(callback);

  return mq.deleteMany(callback);
};

/**
 * Finds documents.
 *
 * The `filter` are cast to their respective SchemaTypes before the command is sent.
 * See our [query casting tutorial](/docs/tutorials/query_casting.html) for
 * more information on how Mongoose casts `filter`.
 *
 * ####Examples:
 *
 *     // named john and at least 18
 *     MyModel.find({ name: 'john', age: { $gte: 18 }});
 *
 *     // executes, passing results to callback
 *     MyModel.find({ name: 'john', age: { $gte: 18 }}, function (err, docs) {});
 *
 *     // executes, name LIKE john and only selecting the "name" and "friends" fields
 *     MyModel.find({ name: /john/i }, 'name friends', function (err, docs) { })
 *
 *     // passing options
 *     MyModel.find({ name: /john/i }, null, { skip: 10 })
 *
 *     // passing options and executes
 *     MyModel.find({ name: /john/i }, null, { skip: 10 }, function (err, docs) {});
 *
 *     // executing a query explicitly
 *     var query = MyModel.find({ name: /john/i }, null, { skip: 10 })
 *     query.exec(function (err, docs) {});
 *
 *     // using the promise returned from executing a query
 *     var query = MyModel.find({ name: /john/i }, null, { skip: 10 });
 *     var promise = query.exec();
 *     promise.addBack(function (err, docs) {});
 *
 * @param {Object|ObjectId} filter
 * @param {Object|String} [projection] optional fields to return, see [`Query.prototype.select()`](http://mongoosejs.com/docs/api.html#query_Query-select)
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback]
 * @return {Query}
 * @see field selection #query_Query-select
 * @see query casting /docs/tutorials/query_casting.html
 * @api public
 */

Model.find = function find(conditions, projection, options, callback) {
  _checkContext(this, 'find');

  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
    projection = null;
    options = null;
  } else if (typeof projection === 'function') {
    callback = projection;
    projection = null;
    options = null;
  } else if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  const mq = new this.Query({}, {}, this, this.collection);
  mq.select(projection);

  mq.setOptions(options);
  if (this.schema.discriminatorMapping &&
      this.schema.discriminatorMapping.isRoot &&
      mq.selectedInclusively()) {
    // Need to select discriminator key because original schema doesn't have it
    mq.select(this.schema.options.discriminatorKey);
  }

  callback = this.$handleCallbackError(callback);

  return mq.find(conditions, callback);
};

/**
 * Finds a single document by its _id field. `findById(id)` is almost*
 * equivalent to `findOne({ _id: id })`. If you want to query by a document's
 * `_id`, use `findById()` instead of `findOne()`.
 *
 * The `id` is cast based on the Schema before sending the command.
 *
 * This function triggers the following middleware.
 *
 * - `findOne()`
 *
 * \* Except for how it treats `undefined`. If you use `findOne()`, you'll see
 * that `findOne(undefined)` and `findOne({ _id: undefined })` are equivalent
 * to `findOne({})` and return arbitrary documents. However, mongoose
 * translates `findById(undefined)` into `findOne({ _id: null })`.
 *
 * ####Example:
 *
 *     // find adventure by id and execute
 *     Adventure.findById(id, function (err, adventure) {});
 *
 *     // same as above
 *     Adventure.findById(id).exec(callback);
 *
 *     // select only the adventures name and length
 *     Adventure.findById(id, 'name length', function (err, adventure) {});
 *
 *     // same as above
 *     Adventure.findById(id, 'name length').exec(callback);
 *
 *     // include all properties except for `length`
 *     Adventure.findById(id, '-length').exec(function (err, adventure) {});
 *
 *     // passing options (in this case return the raw js objects, not mongoose documents by passing `lean`
 *     Adventure.findById(id, 'name', { lean: true }, function (err, doc) {});
 *
 *     // same as above
 *     Adventure.findById(id, 'name').lean().exec(function (err, doc) {});
 *
 * @param {Any} id value of `_id` to query by
 * @param {Object|String} [projection] optional fields to return, see [`Query.prototype.select()`](#query_Query-select)
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback]
 * @return {Query}
 * @see field selection #query_Query-select
 * @see lean queries /docs/tutorials/lean.html
 * @see findById in Mongoose https://masteringjs.io/tutorials/mongoose/find-by-id
 * @api public
 */

Model.findById = function findById(id, projection, options, callback) {
  _checkContext(this, 'findById');

  if (typeof id === 'undefined') {
    id = null;
  }

  callback = this.$handleCallbackError(callback);

  return this.findOne({_id: id}, projection, options, callback);
};

/**
 * Finds one document.
 *
 * The `conditions` are cast to their respective SchemaTypes before the command is sent.
 *
 * *Note:* `conditions` is optional, and if `conditions` is null or undefined,
 * mongoose will send an empty `findOne` command to MongoDB, which will return
 * an arbitrary document. If you're querying by `_id`, use `findById()` instead.
 *
 * ####Example:
 *
 *     // find one iphone adventures - iphone adventures??
 *     Adventure.findOne({ type: 'iphone' }, function (err, adventure) {});
 *
 *     // same as above
 *     Adventure.findOne({ type: 'iphone' }).exec(function (err, adventure) {});
 *
 *     // select only the adventures name
 *     Adventure.findOne({ type: 'iphone' }, 'name', function (err, adventure) {});
 *
 *     // same as above
 *     Adventure.findOne({ type: 'iphone' }, 'name').exec(function (err, adventure) {});
 *
 *     // specify options, in this case lean
 *     Adventure.findOne({ type: 'iphone' }, 'name', { lean: true }, callback);
 *
 *     // same as above
 *     Adventure.findOne({ type: 'iphone' }, 'name', { lean: true }).exec(callback);
 *
 *     // chaining findOne queries (same as above)
 *     Adventure.findOne({ type: 'iphone' }).select('name').lean().exec(callback);
 *
 * @param {Object} [conditions]
 * @param {Object|String} [projection] optional fields to return, see [`Query.prototype.select()`](#query_Query-select)
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback]
 * @return {Query}
 * @see field selection #query_Query-select
 * @see lean queries /docs/tutorials/lean.html
 * @api public
 */

Model.findOne = function findOne(conditions, projection, options, callback) {
  _checkContext(this, 'findOne');

  if (typeof options === 'function') {
    callback = options;
    options = null;
  } else if (typeof projection === 'function') {
    callback = projection;
    projection = null;
    options = null;
  } else if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
    projection = null;
    options = null;
  }

  const mq = new this.Query({}, {}, this, this.collection);
  mq.select(projection);

  mq.setOptions(options);
  if (this.schema.discriminatorMapping &&
      this.schema.discriminatorMapping.isRoot &&
      mq.selectedInclusively()) {
    mq.select(this.schema.options.discriminatorKey);
  }

  callback = this.$handleCallbackError(callback);

  return mq.findOne(conditions, callback);
};

/**
 * Estimates the number of documents in the MongoDB collection. Faster than
 * using `countDocuments()` for large collections because
 * `estimatedDocumentCount()` uses collection metadata rather than scanning
 * the entire collection.
 *
 * ####Example:
 *
 *     const numAdventures = Adventure.estimatedDocumentCount();
 *
 * @param {Object} [options]
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.estimatedDocumentCount = function estimatedDocumentCount(options, callback) {
  _checkContext(this, 'estimatedDocumentCount');

  const mq = new this.Query({}, {}, this, this.collection);

  callback = this.$handleCallbackError(callback);

  return mq.estimatedDocumentCount(options, callback);
};

/**
 * Counts number of documents matching `filter` in a database collection.
 *
 * ####Example:
 *
 *     Adventure.countDocuments({ type: 'jungle' }, function (err, count) {
 *       console.log('there are %d jungle adventures', count);
 *     });
 *
 * If you want to count all documents in a large collection,
 * use the [`estimatedDocumentCount()` function](/docs/api.html#model_Model.estimatedDocumentCount)
 * instead. If you call `countDocuments({})`, MongoDB will always execute
 * a full collection scan and **not** use any indexes.
 *
 * The `countDocuments()` function is similar to `count()`, but there are a
 * [few operators that `countDocuments()` does not support](https://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#countDocuments).
 * Below are the operators that `count()` supports but `countDocuments()` does not,
 * and the suggested replacement:
 *
 * - `$where`: [`$expr`](https://docs.mongodb.com/manual/reference/operator/query/expr/)
 * - `$near`: [`$geoWithin`](https://docs.mongodb.com/manual/reference/operator/query/geoWithin/) with [`$center`](https://docs.mongodb.com/manual/reference/operator/query/center/#op._S_center)
 * - `$nearSphere`: [`$geoWithin`](https://docs.mongodb.com/manual/reference/operator/query/geoWithin/) with [`$centerSphere`](https://docs.mongodb.com/manual/reference/operator/query/centerSphere/#op._S_centerSphere)
 *
 * @param {Object} filter
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.countDocuments = function countDocuments(conditions, callback) {
  _checkContext(this, 'countDocuments');

  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
  }

  const mq = new this.Query({}, {}, this, this.collection);

  callback = this.$handleCallbackError(callback);

  return mq.countDocuments(conditions, callback);
};

/**
 * Counts number of documents that match `filter` in a database collection.
 *
 * This method is deprecated. If you want to count the number of documents in
 * a collection, e.g. `count({})`, use the [`estimatedDocumentCount()` function](/docs/api.html#model_Model.estimatedDocumentCount)
 * instead. Otherwise, use the [`countDocuments()`](/docs/api.html#model_Model.countDocuments) function instead.
 *
 * ####Example:
 *
 *     Adventure.count({ type: 'jungle' }, function (err, count) {
 *       if (err) ..
 *       console.log('there are %d jungle adventures', count);
 *     });
 *
 * @deprecated
 * @param {Object} filter
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.count = function count(conditions, callback) {
  _checkContext(this, 'count');

  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
  }

  const mq = new this.Query({}, {}, this, this.collection);

  callback = this.$handleCallbackError(callback);

  return mq.count(conditions, callback);
};

/**
 * Creates a Query for a `distinct` operation.
 *
 * Passing a `callback` executes the query.
 *
 * ####Example
 *
 *     Link.distinct('url', { clicks: {$gt: 100}}, function (err, result) {
 *       if (err) return handleError(err);
 *
 *       assert(Array.isArray(result));
 *       console.log('unique urls with more than 100 clicks', result);
 *     })
 *
 *     var query = Link.distinct('url');
 *     query.exec(callback);
 *
 * @param {String} field
 * @param {Object} [conditions] optional
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.distinct = function distinct(field, conditions, callback) {
  _checkContext(this, 'distinct');

  const mq = new this.Query({}, {}, this, this.collection);

  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
  }
  callback = this.$handleCallbackError(callback);

  return mq.distinct(field, conditions, callback);
};

/**
 * Creates a Query, applies the passed conditions, and returns the Query.
 *
 * For example, instead of writing:
 *
 *     User.find({age: {$gte: 21, $lte: 65}}, callback);
 *
 * we can instead write:
 *
 *     User.where('age').gte(21).lte(65).exec(callback);
 *
 * Since the Query class also supports `where` you can continue chaining
 *
 *     User
 *     .where('age').gte(21).lte(65)
 *     .where('name', /^b/i)
 *     ... etc
 *
 * @param {String} path
 * @param {Object} [val] optional value
 * @return {Query}
 * @api public
 */

Model.where = function where(path, val) {
  _checkContext(this, 'where');

  void val; // eslint
  const mq = new this.Query({}, {}, this, this.collection).find({});
  return mq.where.apply(mq, arguments);
};

/**
 * Creates a `Query` and specifies a `$where` condition.
 *
 * Sometimes you need to query for things in mongodb using a JavaScript expression. You can do so via `find({ $where: javascript })`, or you can use the mongoose shortcut method $where via a Query chain or from your mongoose Model.
 *
 *     Blog.$where('this.username.indexOf("val") !== -1').exec(function (err, docs) {});
 *
 * @param {String|Function} argument is a javascript string or anonymous function
 * @method $where
 * @memberOf Model
 * @return {Query}
 * @see Query.$where #query_Query-%24where
 * @api public
 */

Model.$where = function $where() {
  _checkContext(this, '$where');

  const mq = new this.Query({}, {}, this, this.collection).find({});
  return mq.$where.apply(mq, arguments);
};

/**
 * Issues a mongodb findAndModify update command.
 *
 * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback. The query executes if `callback` is passed else a Query object is returned.
 *
 * ####Options:
 *
 * - `new`: bool - if true, return the modified document rather than the original. defaults to false (changed in 4.0)
 * - `upsert`: bool - creates the object if it doesn't exist. defaults to false.
 * - `fields`: {Object|String} - Field selection. Equivalent to `.select(fields).findOneAndUpdate()`
 * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `runValidators`: if true, runs [update validators](/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
 * - `setDefaultsOnInsert`: if this and `upsert` are true, mongoose will apply the [defaults](http://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created. This option only works on MongoDB >= 2.4 because it relies on [MongoDB's `$setOnInsert` operator](https://docs.mongodb.org/v2.4/reference/operator/update/setOnInsert/).
 * - `rawResult`: if true, returns the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 * - `strict`: overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict) for this update
 *
 * ####Examples:
 *
 *     A.findOneAndUpdate(conditions, update, options, callback) // executes
 *     A.findOneAndUpdate(conditions, update, options)  // returns Query
 *     A.findOneAndUpdate(conditions, update, callback) // executes
 *     A.findOneAndUpdate(conditions, update)           // returns Query
 *     A.findOneAndUpdate()                             // returns Query
 *
 * ####Note:
 *
 * All top level update keys which are not `atomic` operation names are treated as set operations:
 *
 * ####Example:
 *
 *     var query = { name: 'borne' };
 *     Model.findOneAndUpdate(query, { name: 'jason bourne' }, options, callback)
 *
 *     // is sent as
 *     Model.findOneAndUpdate(query, { $set: { name: 'jason bourne' }}, options, callback)
 *
 * This helps prevent accidentally overwriting your document with `{ name: 'jason bourne' }`.
 *
 * ####Note:
 *
 * Values are cast to their appropriate types when using the findAndModify helpers.
 * However, the below are not executed by default.
 *
 * - defaults. Use the `setDefaultsOnInsert` option to override.
 *
 * `findAndModify` helpers support limited validation. You can
 * enable these by setting the `runValidators` options,
 * respectively.
 *
 * If you need full-fledged validation, use the traditional approach of first
 * retrieving the document.
 *
 *     Model.findById(id, function (err, doc) {
 *       if (err) ..
 *       doc.name = 'jason bourne';
 *       doc.save(callback);
 *     });
 *
 * @param {Object} [conditions]
 * @param {Object} [update]
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Object} [options.lean] if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](/docs/api.html#query_Query-lean) and [the Mongoose lean tutorial](/docs/tutorials/lean.html).
 * @param {ClientSession} [options.session=null] The session associated with this query. See [transactions docs](/docs/transactions.html).
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.omitUndefined=false] If true, delete any properties whose value is `undefined` when casting an update. In other words, if this is set, Mongoose will delete `baz` from the update in `Model.updateOne({}, { foo: 'bar', baz: undefined })` before sending the update to the server.
 * @param {Function} [callback]
 * @return {Query}
 * @see Tutorial /docs/tutorials/findoneandupdate.html
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @api public
 */

Model.findOneAndUpdate = function(conditions, update, options, callback) {
  _checkContext(this, 'findOneAndUpdate');

  if (typeof options === 'function') {
    callback = options;
    options = null;
  } else if (arguments.length === 1) {
    if (typeof conditions === 'function') {
      const msg = 'Model.findOneAndUpdate(): First argument must not be a function.\n\n'
          + '  ' + this.modelName + '.findOneAndUpdate(conditions, update, options, callback)\n'
          + '  ' + this.modelName + '.findOneAndUpdate(conditions, update, options)\n'
          + '  ' + this.modelName + '.findOneAndUpdate(conditions, update)\n'
          + '  ' + this.modelName + '.findOneAndUpdate(update)\n'
          + '  ' + this.modelName + '.findOneAndUpdate()\n';
      throw new TypeError(msg);
    }
    update = conditions;
    conditions = undefined;
  }
  callback = this.$handleCallbackError(callback);

  let fields;
  if (options) {
    fields = options.fields || options.projection;
  }

  update = utils.clone(update, {
    depopulate: true,
    _isNested: true
  });

  _decorateUpdateWithVersionKey(update, options, this.schema.options.versionKey);

  const mq = new this.Query({}, {}, this, this.collection);
  mq.select(fields);

  return mq.findOneAndUpdate(conditions, update, options, callback);
};

/*!
 * Decorate the update with a version key, if necessary
 */

function _decorateUpdateWithVersionKey(update, options, versionKey) {
  if (!versionKey || !get(options, 'upsert', false)) {
    return;
  }

  const updatedPaths = modifiedPaths(update);
  if (!updatedPaths[versionKey]) {
    if (options.overwrite) {
      update[versionKey] = 0;
    } else {
      if (!update.$setOnInsert) {
        update.$setOnInsert = {};
      }
      update.$setOnInsert[versionKey] = 0;
    }
  }
}

/**
 * Issues a mongodb findAndModify update command by a document's _id field.
 * `findByIdAndUpdate(id, ...)` is equivalent to `findOneAndUpdate({ _id: id }, ...)`.
 *
 * Finds a matching document, updates it according to the `update` arg,
 * passing any `options`, and returns the found document (if any) to the
 * callback. The query executes if `callback` is passed.
 *
 * This function triggers the following middleware.
 *
 * - `findOneAndUpdate()`
 *
 * ####Options:
 *
 * - `new`: bool - true to return the modified document rather than the original. defaults to false
 * - `upsert`: bool - creates the object if it doesn't exist. defaults to false.
 * - `runValidators`: if true, runs [update validators](/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
 * - `setDefaultsOnInsert`: if this and `upsert` are true, mongoose will apply the [defaults](http://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created. This option only works on MongoDB >= 2.4 because it relies on [MongoDB's `$setOnInsert` operator](https://docs.mongodb.org/v2.4/reference/operator/update/setOnInsert/).
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `select`: sets the document fields to return
 * - `rawResult`: if true, returns the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 * - `strict`: overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict) for this update
 *
 * ####Examples:
 *
 *     A.findByIdAndUpdate(id, update, options, callback) // executes
 *     A.findByIdAndUpdate(id, update, options)  // returns Query
 *     A.findByIdAndUpdate(id, update, callback) // executes
 *     A.findByIdAndUpdate(id, update)           // returns Query
 *     A.findByIdAndUpdate()                     // returns Query
 *
 * ####Note:
 *
 * All top level update keys which are not `atomic` operation names are treated as set operations:
 *
 * ####Example:
 *
 *     Model.findByIdAndUpdate(id, { name: 'jason bourne' }, options, callback)
 *
 *     // is sent as
 *     Model.findByIdAndUpdate(id, { $set: { name: 'jason bourne' }}, options, callback)
 *
 * This helps prevent accidentally overwriting your document with `{ name: 'jason bourne' }`.
 *
 * ####Note:
 *
 * Values are cast to their appropriate types when using the findAndModify helpers.
 * However, the below are not executed by default.
 *
 * - defaults. Use the `setDefaultsOnInsert` option to override.
 *
 * `findAndModify` helpers support limited validation. You can
 * enable these by setting the `runValidators` options,
 * respectively.
 *
 * If you need full-fledged validation, use the traditional approach of first
 * retrieving the document.
 *
 *     Model.findById(id, function (err, doc) {
 *       if (err) ..
 *       doc.name = 'jason bourne';
 *       doc.save(callback);
 *     });
 *
 * @param {Object|Number|String} id value of `_id` to query by
 * @param {Object} [update]
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Object} [options.lean] if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](/docs/api.html#query_Query-lean) and the [Mongoose lean tutorial](/docs/tutorials/lean.html).
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.omitUndefined=false] If true, delete any properties whose value is `undefined` when casting an update. In other words, if this is set, Mongoose will delete `baz` from the update in `Model.updateOne({}, { foo: 'bar', baz: undefined })` before sending the update to the server.
 * @param {Function} [callback]
 * @return {Query}
 * @see Model.findOneAndUpdate #model_Model.findOneAndUpdate
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @api public
 */

Model.findByIdAndUpdate = function(id, update, options, callback) {
  _checkContext(this, 'findByIdAndUpdate');

  callback = this.$handleCallbackError(callback);
  if (arguments.length === 1) {
    if (typeof id === 'function') {
      const msg = 'Model.findByIdAndUpdate(): First argument must not be a function.\n\n'
          + '  ' + this.modelName + '.findByIdAndUpdate(id, callback)\n'
          + '  ' + this.modelName + '.findByIdAndUpdate(id)\n'
          + '  ' + this.modelName + '.findByIdAndUpdate()\n';
      throw new TypeError(msg);
    }
    return this.findOneAndUpdate({_id: id}, undefined);
  }

  // if a model is passed in instead of an id
  if (id instanceof Document) {
    id = id._id;
  }

  return this.findOneAndUpdate.call(this, {_id: id}, update, options, callback);
};

/**
 * Issue a MongoDB `findOneAndDelete()` command.
 *
 * Finds a matching document, removes it, and passes the found document
 * (if any) to the callback.
 *
 * Executes the query if `callback` is passed.
 *
 * This function triggers the following middleware.
 *
 * - `findOneAndDelete()`
 *
 * This function differs slightly from `Model.findOneAndRemove()` in that
 * `findOneAndRemove()` becomes a [MongoDB `findAndModify()` command](https://docs.mongodb.com/manual/reference/method/db.collection.findAndModify/),
 * as opposed to a `findOneAndDelete()` command. For most mongoose use cases,
 * this distinction is purely pedantic. You should use `findOneAndDelete()`
 * unless you have a good reason not to.
 *
 * ####Options:
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
 * - `select`: sets the document fields to return
 * - `projection`: like select, it determines which fields to return, ex. `{ projection: { _id: 0 } }`
 * - `rawResult`: if true, returns the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 * - `strict`: overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict) for this update
 *
 * ####Examples:
 *
 *     A.findOneAndDelete(conditions, options, callback) // executes
 *     A.findOneAndDelete(conditions, options)  // return Query
 *     A.findOneAndDelete(conditions, callback) // executes
 *     A.findOneAndDelete(conditions) // returns Query
 *     A.findOneAndDelete()           // returns Query
 *
 * Values are cast to their appropriate types when using the findAndModify helpers.
 * However, the below are not executed by default.
 *
 * - defaults. Use the `setDefaultsOnInsert` option to override.
 *
 * `findAndModify` helpers support limited validation. You can
 * enable these by setting the `runValidators` options,
 * respectively.
 *
 * If you need full-fledged validation, use the traditional approach of first
 * retrieving the document.
 *
 *     Model.findById(id, function (err, doc) {
 *       if (err) ..
 *       doc.name = 'jason bourne';
 *       doc.save(callback);
 *     });
 *
 * @param {Object} conditions
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {ClientSession} [options.session=null] The session associated with this query. See [transactions docs](/docs/transactions.html).
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.findOneAndDelete = function(conditions, options, callback) {
  _checkContext(this, 'findOneAndDelete');

  if (arguments.length === 1 && typeof conditions === 'function') {
    const msg = 'Model.findOneAndDelete(): First argument must not be a function.\n\n'
        + '  ' + this.modelName + '.findOneAndDelete(conditions, callback)\n'
        + '  ' + this.modelName + '.findOneAndDelete(conditions)\n'
        + '  ' + this.modelName + '.findOneAndDelete()\n';
    throw new TypeError(msg);
  }

  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  callback = this.$handleCallbackError(callback);

  let fields;
  if (options) {
    fields = options.select;
    options.select = undefined;
  }

  const mq = new this.Query({}, {}, this, this.collection);
  mq.select(fields);

  return mq.findOneAndDelete(conditions, options, callback);
};

/**
 * Issue a MongoDB `findOneAndDelete()` command by a document's _id field.
 * In other words, `findByIdAndDelete(id)` is a shorthand for
 * `findOneAndDelete({ _id: id })`.
 *
 * This function triggers the following middleware.
 *
 * - `findOneAndDelete()`
 *
 * @param {Object|Number|String} id value of `_id` to query by
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {Function} [callback]
 * @return {Query}
 * @see Model.findOneAndRemove #model_Model.findOneAndRemove
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 */

Model.findByIdAndDelete = function(id, options, callback) {
  _checkContext(this, 'findByIdAndDelete');

  if (arguments.length === 1 && typeof id === 'function') {
    const msg = 'Model.findByIdAndDelete(): First argument must not be a function.\n\n'
        + '  ' + this.modelName + '.findByIdAndDelete(id, callback)\n'
        + '  ' + this.modelName + '.findByIdAndDelete(id)\n'
        + '  ' + this.modelName + '.findByIdAndDelete()\n';
    throw new TypeError(msg);
  }
  callback = this.$handleCallbackError(callback);

  return this.findOneAndDelete({_id: id}, options, callback);
};

/**
 * Issue a MongoDB `findOneAndReplace()` command.
 *
 * Finds a matching document, replaces it with the provided doc, and passes the
 * returned doc to the callback.
 *
 * Executes the query if `callback` is passed.
 *
 * This function triggers the following query middleware.
 *
 * - `findOneAndReplace()`
 *
 * ####Options:
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
 * - `select`: sets the document fields to return
 * - `projection`: like select, it determines which fields to return, ex. `{ projection: { _id: 0 } }`
 * - `rawResult`: if true, returns the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 * - `strict`: overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict) for this update
 *
 * ####Examples:
 *
 *     A.findOneAndReplace(conditions, options, callback) // executes
 *     A.findOneAndReplace(conditions, options)  // return Query
 *     A.findOneAndReplace(conditions, callback) // executes
 *     A.findOneAndReplace(conditions) // returns Query
 *     A.findOneAndReplace()           // returns Query
 *
 * Values are cast to their appropriate types when using the findAndModify helpers.
 * However, the below are not executed by default.
 *
 * - defaults. Use the `setDefaultsOnInsert` option to override.
 *
 * @param {Object} filter Replace the first document that matches this filter
 * @param {Object} [replacement] Replace with this document
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Object} [options.lean] if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](http://mongoosejs.com/docs/api.html#query_Query-lean).
 * @param {ClientSession} [options.session=null] The session associated with this query. See [transactions docs](/docs/transactions.html).
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.omitUndefined=false] If true, delete any properties whose value is `undefined` when casting an update. In other words, if this is set, Mongoose will delete `baz` from the update in `Model.updateOne({}, { foo: 'bar', baz: undefined })` before sending the update to the server.
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.findOneAndReplace = function(filter, replacement, options, callback) {
  _checkContext(this, 'findOneAndReplace');

  if (arguments.length === 1 && typeof filter === 'function') {
    const msg = 'Model.findOneAndReplace(): First argument must not be a function.\n\n'
        + '  ' + this.modelName + '.findOneAndReplace(conditions, callback)\n'
        + '  ' + this.modelName + '.findOneAndReplace(conditions)\n'
        + '  ' + this.modelName + '.findOneAndReplace()\n';
    throw new TypeError(msg);
  }

  if (arguments.length === 3 && typeof options === 'function') {
    callback = options;
    options = replacement;
    replacement = void 0;
  }
  if (arguments.length === 2 && typeof replacement === 'function') {
    callback = replacement;
    replacement = void 0;
    options = void 0;
  }
  callback = this.$handleCallbackError(callback);

  let fields;
  if (options) {
    fields = options.select;
    options.select = undefined;
  }

  const mq = new this.Query({}, {}, this, this.collection);
  mq.select(fields);

  return mq.findOneAndReplace(filter, replacement, options, callback);
};

/**
 * Issue a mongodb findAndModify remove command.
 *
 * Finds a matching document, removes it, passing the found document (if any) to the callback.
 *
 * Executes the query if `callback` is passed.
 *
 * This function triggers the following middleware.
 *
 * - `findOneAndRemove()`
 *
 * ####Options:
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
 * - `select`: sets the document fields to return
 * - `projection`: like select, it determines which fields to return, ex. `{ projection: { _id: 0 } }`
 * - `rawResult`: if true, returns the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 * - `strict`: overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict) for this update
 *
 * ####Examples:
 *
 *     A.findOneAndRemove(conditions, options, callback) // executes
 *     A.findOneAndRemove(conditions, options)  // return Query
 *     A.findOneAndRemove(conditions, callback) // executes
 *     A.findOneAndRemove(conditions) // returns Query
 *     A.findOneAndRemove()           // returns Query
 *
 * Values are cast to their appropriate types when using the findAndModify helpers.
 * However, the below are not executed by default.
 *
 * - defaults. Use the `setDefaultsOnInsert` option to override.
 *
 * `findAndModify` helpers support limited validation. You can
 * enable these by setting the `runValidators` options,
 * respectively.
 *
 * If you need full-fledged validation, use the traditional approach of first
 * retrieving the document.
 *
 *     Model.findById(id, function (err, doc) {
 *       if (err) ..
 *       doc.name = 'jason bourne';
 *       doc.save(callback);
 *     });
 *
 * @param {Object} conditions
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {ClientSession} [options.session=null] The session associated with this query. See [transactions docs](/docs/transactions.html).
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {Function} [callback]
 * @return {Query}
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @api public
 */

Model.findOneAndRemove = function(conditions, options, callback) {
  _checkContext(this, 'findOneAndRemove');

  if (arguments.length === 1 && typeof conditions === 'function') {
    const msg = 'Model.findOneAndRemove(): First argument must not be a function.\n\n'
        + '  ' + this.modelName + '.findOneAndRemove(conditions, callback)\n'
        + '  ' + this.modelName + '.findOneAndRemove(conditions)\n'
        + '  ' + this.modelName + '.findOneAndRemove()\n';
    throw new TypeError(msg);
  }

  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  callback = this.$handleCallbackError(callback);

  let fields;
  if (options) {
    fields = options.select;
    options.select = undefined;
  }

  const mq = new this.Query({}, {}, this, this.collection);
  mq.select(fields);

  return mq.findOneAndRemove(conditions, options, callback);
};

/**
 * Issue a mongodb findAndModify remove command by a document's _id field. `findByIdAndRemove(id, ...)` is equivalent to `findOneAndRemove({ _id: id }, ...)`.
 *
 * Finds a matching document, removes it, passing the found document (if any) to the callback.
 *
 * Executes the query if `callback` is passed.
 *
 * This function triggers the following middleware.
 *
 * - `findOneAndRemove()`
 *
 * ####Options:
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `select`: sets the document fields to return
 * - `rawResult`: if true, returns the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 * - `strict`: overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict) for this update
 *
 * ####Examples:
 *
 *     A.findByIdAndRemove(id, options, callback) // executes
 *     A.findByIdAndRemove(id, options)  // return Query
 *     A.findByIdAndRemove(id, callback) // executes
 *     A.findByIdAndRemove(id) // returns Query
 *     A.findByIdAndRemove()           // returns Query
 *
 * @param {Object|Number|String} id value of `_id` to query by
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {ClientSession} [options.session=null] The session associated with this query. See [transactions docs](/docs/transactions.html).
 * @param {Function} [callback]
 * @return {Query}
 * @see Model.findOneAndRemove #model_Model.findOneAndRemove
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 */

Model.findByIdAndRemove = function(id, options, callback) {
  _checkContext(this, 'findByIdAndRemove');

  if (arguments.length === 1 && typeof id === 'function') {
    const msg = 'Model.findByIdAndRemove(): First argument must not be a function.\n\n'
        + '  ' + this.modelName + '.findByIdAndRemove(id, callback)\n'
        + '  ' + this.modelName + '.findByIdAndRemove(id)\n'
        + '  ' + this.modelName + '.findByIdAndRemove()\n';
    throw new TypeError(msg);
  }
  callback = this.$handleCallbackError(callback);

  return this.findOneAndRemove({_id: id}, options, callback);
};

/**
 * Shortcut for saving one or more documents to the database.
 * `MyModel.create(docs)` does `new MyModel(doc).save()` for every doc in
 * docs.
 *
 * This function triggers the following middleware.
 *
 * - `save()`
 *
 * ####Example:
 *
 *     // pass a spread of docs and a callback
 *     Candy.create({ type: 'jelly bean' }, { type: 'snickers' }, function (err, jellybean, snickers) {
 *       if (err) // ...
 *     });
 *
 *     // pass an array of docs
 *     var array = [{ type: 'jelly bean' }, { type: 'snickers' }];
 *     Candy.create(array, function (err, candies) {
 *       if (err) // ...
 *
 *       var jellybean = candies[0];
 *       var snickers = candies[1];
 *       // ...
 *     });
 *
 *     // callback is optional; use the returned promise if you like:
 *     var promise = Candy.create({ type: 'jawbreaker' });
 *     promise.then(function (jawbreaker) {
 *       // ...
 *     })
 *
 * @param {Array|Object} docs Documents to insert, as a spread or array
 * @param {Object} [options] Options passed down to `save()`. To specify `options`, `docs` **must** be an array, not a spread.
 * @param {Function} [callback] callback
 * @return {Promise}
 * @api public
 */

Model.create = function create(doc, options, callback) {
  _checkContext(this, 'create');

  let args;
  let cb;
  const discriminatorKey = this.schema.options.discriminatorKey;

  if (Array.isArray(doc)) {
    args = doc;
    cb = typeof options === 'function' ? options : callback;
    options = options != null && typeof options === 'object' ? options : {};
  } else {
    const last = arguments[arguments.length - 1];
    options = {};
    // Handle falsy callbacks re: #5061
    if (typeof last === 'function' || !last) {
      cb = last;
      args = utils.args(arguments, 0, arguments.length - 1);
    } else {
      args = utils.args(arguments);
    }

    if (args.length === 2 &&
        args[0] != null &&
        args[1] != null &&
        args[0].session == null &&
        last.session != null &&
        last.session.constructor.name === 'ClientSession' &&
        !this.schema.path('session')) {
      // Probably means the user is running into the common mistake of trying
      // to use a spread to specify options, see gh-7535
      console.warn('WARNING: to pass a `session` to `Model.create()` in ' +
        'Mongoose, you **must** pass an array as the first argument. See: ' +
        'https://mongoosejs.com/docs/api.html#model_Model.create');
    }
  }

  return utils.promiseOrCallback(cb, cb => {
    cb = this.$wrapCallback(cb);
    if (args.length === 0) {
      return cb(null);
    }

    const toExecute = [];
    let firstError;
    args.forEach(doc => {
      toExecute.push(callback => {
        const Model = this.discriminators && doc[discriminatorKey] != null ?
          this.discriminators[doc[discriminatorKey]] || getDiscriminatorByValue(this, doc[discriminatorKey]) :
          this;
        if (Model == null) {
          throw new MongooseError(`Discriminator "${doc[discriminatorKey]}" not ` +
            `found for model "${this.modelName}"`);
        }
        let toSave = doc;
        const callbackWrapper = (error, doc) => {
          if (error) {
            if (!firstError) {
              firstError = error;
            }
            return callback(null, { error: error });
          }
          callback(null, { doc: doc });
        };

        if (!(toSave instanceof Model)) {
          try {
            toSave = new Model(toSave);
          } catch (error) {
            return callbackWrapper(error);
          }
        }

        toSave.save(options, callbackWrapper);
      });
    });

    let numFns = toExecute.length;
    if (numFns === 0) {
      return cb(null, []);
    }
    const _done = (error, res) => {
      const savedDocs = [];
      const len = res.length;
      for (let i = 0; i < len; ++i) {
        if (res[i].doc) {
          savedDocs.push(res[i].doc);
        }
      }

      if (firstError) {
        return cb(firstError, savedDocs);
      }

      if (doc instanceof Array) {
        cb(null, savedDocs);
      } else {
        cb.apply(this, [null].concat(savedDocs));
      }
    };

    const _res = [];
    toExecute.forEach((fn, i) => {
      fn((err, res) => {
        _res[i] = res;
        if (--numFns <= 0) {
          return _done(null, _res);
        }
      });
    });
  }, this.events);
};

/**
 * _Requires a replica set running MongoDB >= 3.6.0._ Watches the
 * underlying collection for changes using
 * [MongoDB change streams](https://docs.mongodb.com/manual/changeStreams/).
 *
 * This function does **not** trigger any middleware. In particular, it
 * does **not** trigger aggregate middleware.
 *
 * The ChangeStream object is an event emitter that emits the following events:
 *
 * - 'change': A change occurred, see below example
 * - 'error': An unrecoverable error occurred. In particular, change streams currently error out if they lose connection to the replica set primary. Follow [this GitHub issue](https://github.com/Automattic/mongoose/issues/6799) for updates.
 * - 'end': Emitted if the underlying stream is closed
 * - 'close': Emitted if the underlying stream is closed
 *
 * ####Example:
 *
 *     const doc = await Person.create({ name: 'Ned Stark' });
 *     const changeStream = Person.watch().on('change', change => console.log(change));
 *     // Will print from the above `console.log()`:
 *     // { _id: { _data: ... },
 *     //   operationType: 'delete',
 *     //   ns: { db: 'mydb', coll: 'Person' },
 *     //   documentKey: { _id: 5a51b125c5500f5aa094c7bd } }
 *     await doc.remove();
 *
 * @param {Array} [pipeline]
 * @param {Object} [options] see the [mongodb driver options](http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html#watch)
 * @return {ChangeStream} mongoose-specific change stream wrapper, inherits from EventEmitter
 * @api public
 */

Model.watch = function(pipeline, options) {
  _checkContext(this, 'watch');

  return new ChangeStream(this, pipeline, options);
};

/**
 * _Requires MongoDB >= 3.6.0._ Starts a [MongoDB session](https://docs.mongodb.com/manual/release-notes/3.6/#client-sessions)
 * for benefits like causal consistency, [retryable writes](https://docs.mongodb.com/manual/core/retryable-writes/),
 * and [transactions](http://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html).
 *
 * Calling `MyModel.startSession()` is equivalent to calling `MyModel.db.startSession()`.
 *
 * This function does not trigger any middleware.
 *
 * ####Example:
 *
 *     const session = await Person.startSession();
 *     let doc = await Person.findOne({ name: 'Ned Stark' }, null, { session });
 *     await doc.remove();
 *     // `doc` will always be null, even if reading from a replica set
 *     // secondary. Without causal consistency, it is possible to
 *     // get a doc back from the below query if the query reads from a
 *     // secondary that is experiencing replication lag.
 *     doc = await Person.findOne({ name: 'Ned Stark' }, null, { session, readPreference: 'secondary' });
 *
 * @param {Object} [options] see the [mongodb driver options](http://mongodb.github.io/node-mongodb-native/3.0/api/MongoClient.html#startSession)
 * @param {Boolean} [options.causalConsistency=true] set to false to disable causal consistency
 * @param {Function} [callback]
 * @return {Promise<ClientSession>} promise that resolves to a MongoDB driver `ClientSession`
 * @api public
 */

Model.startSession = function() {
  _checkContext(this, 'startSession');

  return this.db.startSession.apply(this.db, arguments);
};

/**
 * Shortcut for validating an array of documents and inserting them into
 * MongoDB if they're all valid. This function is faster than `.create()`
 * because it only sends one operation to the server, rather than one for each
 * document.
 *
 * Mongoose always validates each document **before** sending `insertMany`
 * to MongoDB. So if one document has a validation error, no documents will
 * be saved, unless you set
 * [the `ordered` option to false](https://docs.mongodb.com/manual/reference/method/db.collection.insertMany/#error-handling).
 *
 * This function does **not** trigger save middleware.
 *
 * This function triggers the following middleware.
 *
 * - `insertMany()`
 *
 * ####Example:
 *
 *     var arr = [{ name: 'Star Wars' }, { name: 'The Empire Strikes Back' }];
 *     Movies.insertMany(arr, function(error, docs) {});
 *
 * @param {Array|Object|*} doc(s)
 * @param {Object} [options] see the [mongodb driver options](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#insertMany)
 * @param {Boolean} [options.ordered = true] if true, will fail fast on the first error encountered. If false, will insert all the documents it can and report errors later. An `insertMany()` with `ordered = false` is called an "unordered" `insertMany()`.
 * @param {Boolean} [options.rawResult = false] if false, the returned promise resolves to the documents that passed mongoose document validation. If `true`, will return the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~insertWriteOpCallback) with a `mongoose` property that contains `validationErrors` if this is an unordered `insertMany`.
 * @param {Function} [callback] callback
 * @return {Promise}
 * @api public
 */

Model.insertMany = function(arr, options, callback) {
  _checkContext(this, 'insertMany');

  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  return utils.promiseOrCallback(callback, cb => {
    this.$__insertMany(arr, options, cb);
  }, this.events);
};

/*!
 * ignore
 */

Model.$__insertMany = function(arr, options, callback) {
  const _this = this;
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  if (callback) {
    callback = this.$handleCallbackError(callback);
    callback = this.$wrapCallback(callback);
  }
  callback = callback || utils.noop;
  options = options || {};
  const limit = get(options, 'limit', 1000);
  const rawResult = get(options, 'rawResult', false);
  const ordered = get(options, 'ordered', true);

  if (!Array.isArray(arr)) {
    arr = [arr];
  }

  const toExecute = [];
  const validationErrors = [];

  arr.forEach(function(doc) {
    toExecute.push(function(callback) {
      if (!(doc instanceof _this)) {
        try {
          doc = new _this(doc);
        } catch (err) {
          return callback(err);
        }
      }
      if (options.session != null) {
        doc.$session(options.session);
      }
      doc.validate({ __noPromise: true }, function(error) {
        if (error) {
          // Option `ordered` signals that insert should be continued after reaching
          // a failing insert. Therefore we delegate "null", meaning the validation
          // failed. It's up to the next function to filter out all failed models
          if (ordered === false) {
            validationErrors.push(error);
            return callback(null, null);
          }
          return callback(error);
        }
        callback(null, doc);
      });
    });
  });

  parallelLimit(toExecute, limit, function(error, docs) {
    if (error) {
      callback(error, null);
      return;
    }
    // We filter all failed pre-validations by removing nulls
    const docAttributes = docs.filter(function(doc) {
      return doc != null;
    });
    // Quickly escape while there aren't any valid docAttributes
    if (docAttributes.length < 1) {
      callback(null, []);
      return;
    }
    const docObjects = docAttributes.map(function(doc) {
      if (doc.schema.options.versionKey) {
        doc[doc.schema.options.versionKey] = 0;
      }
      if (doc.initializeTimestamps) {
        return doc.initializeTimestamps().toObject(internalToObjectOptions);
      }
      return doc.toObject(internalToObjectOptions);
    });

    _this.collection.insertMany(docObjects, options, function(error, res) {
      if (error) {
        callback(error, null);
        return;
      }
      for (let i = 0; i < docAttributes.length; ++i) {
        docAttributes[i].$__reset();
        _setIsNew(docAttributes[i], false);
      }
      if (rawResult) {
        if (ordered === false) {
          // Decorate with mongoose validation errors in case of unordered,
          // because then still do `insertMany()`
          res.mongoose = {
            validationErrors: validationErrors
          };
        }
        return callback(null, res);
      }
      callback(null, docAttributes);
    });
  });
};

/*!
 * ignore
 */

function _setIsNew(doc, val) {
  doc.isNew = val;
  doc.emit('isNew', val);
  doc.constructor.emit('isNew', val);

  const subdocs = doc.$__getAllSubdocs();
  for (const subdoc of subdocs) {
    subdoc.isNew = val;
  }
}

/**
 * Sends multiple `insertOne`, `updateOne`, `updateMany`, `replaceOne`,
 * `deleteOne`, and/or `deleteMany` operations to the MongoDB server in one
 * command. This is faster than sending multiple independent operations (like)
 * if you use `create()`) because with `bulkWrite()` there is only one round
 * trip to MongoDB.
 *
 * Mongoose will perform casting on all operations you provide.
 *
 * This function does **not** trigger any middleware, not `save()` nor `update()`.
 * If you need to trigger
 * `save()` middleware for every document use [`create()`](http://mongoosejs.com/docs/api.html#model_Model.create) instead.
 *
 * ####Example:
 *
 *     Character.bulkWrite([
 *       {
 *         insertOne: {
 *           document: {
 *             name: 'Eddard Stark',
 *             title: 'Warden of the North'
 *           }
 *         }
 *       },
 *       {
 *         updateOne: {
 *           filter: { name: 'Eddard Stark' },
 *           // If you were using the MongoDB driver directly, you'd need to do
 *           // `update: { $set: { title: ... } }` but mongoose adds $set for
 *           // you.
 *           update: { title: 'Hand of the King' }
 *         }
 *       },
 *       {
 *         deleteOne: {
 *           {
 *             filter: { name: 'Eddard Stark' }
 *           }
 *         }
 *       }
 *     ]).then(res => {
 *      // Prints "1 1 1"
 *      console.log(res.insertedCount, res.modifiedCount, res.deletedCount);
 *     });
 *
 * The [supported operations](https://docs.mongodb.com/manual/reference/method/db.collection.bulkWrite/#db.collection.bulkWrite) are:
 *
 * - `insertOne`
 * - `updateOne`
 * - `updateMany`
 * - `deleteOne`
 * - `deleteMany`
 * - `replaceOne`
 *
 * @param {Array} ops
 * @param {Object} [ops.insertOne.document] The document to insert
 * @param {Object} [opts.updateOne.filter] Update the first document that matches this filter
 * @param {Object} [opts.updateOne.update] An object containing [update operators](https://docs.mongodb.com/manual/reference/operator/update/)
 * @param {Boolean} [opts.updateOne.upsert=false] If true, insert a doc if none match
 * @param {Object} [opts.updateOne.collation] The [MongoDB collation](https://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-collations) to use
 * @param {Array} [opts.updateOne.arrayFilters] The [array filters](https://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-36-array-filters.html) used in `update`
 * @param {Object} [opts.updateMany.filter] Update all the documents that match this filter
 * @param {Object} [opts.updateMany.update] An object containing [update operators](https://docs.mongodb.com/manual/reference/operator/update/)
 * @param {Boolean} [opts.updateMany.upsert=false] If true, insert a doc if no documents match `filter`
 * @param {Object} [opts.updateMany.collation] The [MongoDB collation](https://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-collations) to use
 * @param {Array} [opts.updateMany.arrayFilters] The [array filters](https://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-36-array-filters.html) used in `update`
 * @param {Object} [opts.deleteOne.filter] Delete the first document that matches this filter
 * @param {Object} [opts.deleteMany.filter] Delete all documents that match this filter
 * @param {Object} [opts.replaceOne.filter] Replace the first document that matches this filter
 * @param {Object} [opts.replaceOne.replacement] The replacement document
 * @param {Boolean} [opts.replaceOne.upsert=false] If true, insert a doc if no documents match `filter`
 * @param {Object} [options]
 * @param {Boolean} [options.ordered=true] If true, execute writes in order and stop at the first error. If false, execute writes in parallel and continue until all writes have either succeeded or errored.
 * @param {ClientSession} [options.session=null] The session associated with this bulk write. See [transactions docs](/docs/transactions.html).
 * @param {String|number} [options.w=1] The [write concern](https://docs.mongodb.com/manual/reference/write-concern/). See [`Query#w()`](/docs/api.html#query_Query-w) for more information.
 * @param {number} [options.wtimeout=null] The [write concern timeout](https://docs.mongodb.com/manual/reference/write-concern/#wtimeout).
 * @param {Boolean} [options.j=true] If false, disable [journal acknowledgement](https://docs.mongodb.com/manual/reference/write-concern/#j-option)
 * @param {Boolean} [options.bypassDocumentValidation=false] If true, disable [MongoDB server-side schema validation](https://docs.mongodb.com/manual/core/schema-validation/) for all writes in this bulk.
 * @param {Function} [callback] callback `function(error, bulkWriteOpResult) {}`
 * @return {Promise} resolves to a [`BulkWriteOpResult`](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#~BulkWriteOpResult) if the operation succeeds
 * @api public
 */

Model.bulkWrite = function(ops, options, callback) {
  _checkContext(this, 'bulkWrite');

  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  options = options || {};

  const validations = ops.map(op => castBulkWrite(this, op, options));

  callback = this.$handleCallbackError(callback);

  return utils.promiseOrCallback(callback, cb => {
    cb = this.$wrapCallback(cb);
    each(validations, (fn, cb) => fn(cb), error => {
      if (error) {
        return cb(error);
      }

      this.collection.bulkWrite(ops, options, (error, res) => {
        if (error) {
          return cb(error);
        }

        cb(null, res);
      });
    });
  }, this.events);
};

/**
 * Shortcut for creating a new Document from existing raw data, pre-saved in the DB.
 * The document returned has no paths marked as modified initially.
 *
 * ####Example:
 *
 *     // hydrate previous data into a Mongoose document
 *     var mongooseCandy = Candy.hydrate({ _id: '54108337212ffb6d459f854c', type: 'jelly bean' });
 *
 * @param {Object} obj
 * @return {Document} document instance
 * @api public
 */

Model.hydrate = function(obj) {
  _checkContext(this, 'hydrate');

  const model = require('./queryhelpers').createModel(this, obj);
  model.init(obj);
  return model;
};

/**
 * Updates one document in the database without returning it.
 *
 * This function triggers the following middleware.
 *
 * - `update()`
 *
 * ####Examples:
 *
 *     MyModel.update({ age: { $gt: 18 } }, { oldEnough: true }, fn);
 *
 *     const res = await MyModel.update({ name: 'Tobi' }, { ferret: true });
 *     res.n; // Number of documents that matched `{ name: 'Tobi' }`
 *     // Number of documents that were changed. If every doc matched already
 *     // had `ferret` set to `true`, `nModified` will be 0.
 *     res.nModified;
 *
 * ####Valid options:
 *
 *  - `strict` (boolean): overrides the [schema-level `strict` option](/docs/guide.html#strict) for this update
 *  - `upsert` (boolean): whether to create the doc if it doesn't match (false)
 *  - `writeConcern` (object): sets the [write concern](https://docs.mongodb.com/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](/docs/guide.html#writeConcern)
 *  - `omitUndefined` (boolean): If true, delete any properties whose value is `undefined` when casting an update. In other words, if this is set, Mongoose will delete `baz` from the update in `Model.updateOne({}, { foo: 'bar', baz: undefined })` before sending the update to the server.
 *  - `multi` (boolean): whether multiple documents should be updated (false)
 *  - `runValidators`: if true, runs [update validators](/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
 *  - `setDefaultsOnInsert` (boolean): if this and `upsert` are true, mongoose will apply the [defaults](http://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created. This option only works on MongoDB >= 2.4 because it relies on [MongoDB's `$setOnInsert` operator](https://docs.mongodb.org/v2.4/reference/operator/update/setOnInsert/).
 *  - `timestamps` (boolean): If set to `false` and [schema-level timestamps](/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Does nothing if schema-level timestamps are not set.
 *  - `overwrite` (boolean): disables update-only mode, allowing you to overwrite the doc (false)
 *
 * All `update` values are cast to their appropriate SchemaTypes before being sent.
 *
 * The `callback` function receives `(err, rawResponse)`.
 *
 * - `err` is the error if any occurred
 * - `rawResponse` is the full response from Mongo
 *
 * ####Note:
 *
 * All top level keys which are not `atomic` operation names are treated as set operations:
 *
 * ####Example:
 *
 *     var query = { name: 'borne' };
 *     Model.update(query, { name: 'jason bourne' }, options, callback);
 *
 *     // is sent as
 *     Model.update(query, { $set: { name: 'jason bourne' }}, options, function(err, res));
 *     // if overwrite option is false. If overwrite is true, sent without the $set wrapper.
 *
 * This helps prevent accidentally overwriting all documents in your collection with `{ name: 'jason bourne' }`.
 *
 * ####Note:
 *
 * Be careful to not use an existing model instance for the update clause (this won't work and can cause weird behavior like infinite loops). Also, ensure that the update clause does not have an _id property, which causes Mongo to return a "Mod on _id not allowed" error.
 *
 * ####Note:
 *
 * Mongoose casts values and runs setters when using update. The following
 * features are **not** applied by default.
 *
 * - [defaults](/docs/defaults.html#the-setdefaultsoninsert-option)
 * - [validators](/docs/validation.html#update-validators)
 * - middleware
 *
 * If you need document middleware and fully-featured validation, load the
 * document first and then use [`save()`](/docs/api.html#model_Model-save).
 *
 *     Model.findOne({ name: 'borne' }, function (err, doc) {
 *       if (err) ..
 *       doc.name = 'jason bourne';
 *       doc.save(callback);
 *     })
 *
 * @see strict http://mongoosejs.com/docs/guide.html#strict
 * @see response http://docs.mongodb.org/v2.6/reference/command/update/#output
 * @param {Object} filter
 * @param {Object} doc
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.upsert=false] if true, and no documents found, insert a new document
 * @param {Object} [options.writeConcern=null] sets the [write concern](https://docs.mongodb.com/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](/docs/guide.html#writeConcern)
 * @param {Boolean} [options.omitUndefined=false] If true, delete any properties whose value is `undefined` when casting an update. In other words, if this is set, Mongoose will delete `baz` from the update in `Model.updateOne({}, { foo: 'bar', baz: undefined })` before sending the update to the server.
 * @param {Boolean} [options.multi=false] whether multiple documents should be updated or just the first one that matches `filter`.
 * @param {Boolean} [options.runValidators=false] if true, runs [update validators](/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
 * @param {Boolean} [options.setDefaultsOnInsert=false] if this and `upsert` are true, mongoose will apply the [defaults](http://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created. This option only works on MongoDB >= 2.4 because it relies on [MongoDB's `$setOnInsert` operator](https://docs.mongodb.org/v2.4/reference/operator/update/setOnInsert/).
 * @param {Boolean} [options.timestamps=null] If set to `false` and [schema-level timestamps](/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Does nothing if schema-level timestamps are not set.
 * @param {Boolean} [options.overwrite=false] By default, if you don't include any [update operators](https://docs.mongodb.com/manual/reference/operator/update/) in `doc`, Mongoose will wrap `doc` in `$set` for you. This prevents you from accidentally overwriting the document. This option tells Mongoose to skip adding `$set`.
 * @param {Function} [callback] params are (error, writeOpResult)
 * @param {Function} [callback]
 * @return {Query}
 * @see MongoDB docs https://docs.mongodb.com/manual/reference/command/update/#update-command-output
 * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
 * @see Query docs https://mongoosejs.com/docs/queries.html
 * @api public
 */

Model.update = function update(conditions, doc, options, callback) {
  _checkContext(this, 'update');

  return _update(this, 'update', conditions, doc, options, callback);
};

/**
 * Same as `update()`, except MongoDB will update _all_ documents that match
 * `filter` (as opposed to just the first one) regardless of the value of
 * the `multi` option.
 *
 * **Note** updateMany will _not_ fire update middleware. Use `pre('updateMany')`
 * and `post('updateMany')` instead.
 *
 * ####Example:
 *     const res = await Person.updateMany({ name: /Stark$/ }, { isDeleted: true });
 *     res.n; // Number of documents matched
 *     res.nModified; // Number of documents modified
 *
 * This function triggers the following middleware.
 *
 * - `updateMany()`
 *
 * @param {Object} filter
 * @param {Object} doc
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.upsert=false] if true, and no documents found, insert a new document
 * @param {Object} [options.writeConcern=null] sets the [write concern](https://docs.mongodb.com/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](/docs/guide.html#writeConcern)
 * @param {Boolean} [options.omitUndefined=false] If true, delete any properties whose value is `undefined` when casting an update. In other words, if this is set, Mongoose will delete `baz` from the update in `Model.updateOne({}, { foo: 'bar', baz: undefined })` before sending the update to the server.
 * @param {Boolean} [options.timestamps=null] If set to `false` and [schema-level timestamps](/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Does nothing if schema-level timestamps are not set.
 * @param {Function} [callback] `function(error, res) {}` where `res` has 3 properties: `n`, `nModified`, `ok`.
 * @return {Query}
 * @see Query docs https://mongoosejs.com/docs/queries.html
 * @see MongoDB docs https://docs.mongodb.com/manual/reference/command/update/#update-command-output
 * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
 * @api public
 */

Model.updateMany = function updateMany(conditions, doc, options, callback) {
  _checkContext(this, 'updateMany');

  return _update(this, 'updateMany', conditions, doc, options, callback);
};

/**
 * Same as `update()`, except it does not support the `multi` or `overwrite`
 * options.
 *
 * - MongoDB will update _only_ the first document that matches `filter` regardless of the value of the `multi` option.
 * - Use `replaceOne()` if you want to overwrite an entire document rather than using atomic operators like `$set`.
 *
 * ####Example:
 *     const res = await Person.updateOne({ name: 'Jean-Luc Picard' }, { ship: 'USS Enterprise' });
 *     res.n; // Number of documents matched
 *     res.nModified; // Number of documents modified
 *
 * This function triggers the following middleware.
 *
 * - `updateOne()`
 *
 * @param {Object} filter
 * @param {Object} doc
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.upsert=false] if true, and no documents found, insert a new document
 * @param {Object} [options.writeConcern=null] sets the [write concern](https://docs.mongodb.com/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](/docs/guide.html#writeConcern)
 * @param {Boolean} [options.omitUndefined=false] If true, delete any properties whose value is `undefined` when casting an update. In other words, if this is set, Mongoose will delete `baz` from the update in `Model.updateOne({}, { foo: 'bar', baz: undefined })` before sending the update to the server.
 * @param {Boolean} [options.timestamps=null] If set to `false` and [schema-level timestamps](/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Does nothing if schema-level timestamps are not set.
 * @param {Function} [callback] params are (error, writeOpResult)
 * @return {Query}
 * @see Query docs https://mongoosejs.com/docs/queries.html
 * @see MongoDB docs https://docs.mongodb.com/manual/reference/command/update/#update-command-output
 * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
 * @api public
 */

Model.updateOne = function updateOne(conditions, doc, options, callback) {
  _checkContext(this, 'updateOne');

  return _update(this, 'updateOne', conditions, doc, options, callback);
};

/**
 * Same as `update()`, except MongoDB replace the existing document with the
 * given document (no atomic operators like `$set`).
 *
 * ####Example:
 *     const res = await Person.replaceOne({ _id: 24601 }, { name: 'Jean Valjean' });
 *     res.n; // Number of documents matched
 *     res.nModified; // Number of documents modified
 *
 * This function triggers the following middleware.
 *
 * - `replaceOne()`
 *
 * @param {Object} filter
 * @param {Object} doc
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.upsert=false] if true, and no documents found, insert a new document
 * @param {Object} [options.writeConcern=null] sets the [write concern](https://docs.mongodb.com/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](/docs/guide.html#writeConcern)
 * @param {Boolean} [options.omitUndefined=false] If true, delete any properties whose value is `undefined` when casting an update. In other words, if this is set, Mongoose will delete `baz` from the update in `Model.updateOne({}, { foo: 'bar', baz: undefined })` before sending the update to the server.
 * @param {Boolean} [options.timestamps=null] If set to `false` and [schema-level timestamps](/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Does nothing if schema-level timestamps are not set.
 * @param {Function} [callback] `function(error, res) {}` where `res` has 3 properties: `n`, `nModified`, `ok`.
 * @return {Query}
 * @see Query docs https://mongoosejs.com/docs/queries.html
 * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
 * @return {Query}
 * @api public
 */

Model.replaceOne = function replaceOne(conditions, doc, options, callback) {
  _checkContext(this, 'replaceOne');

  const versionKey = get(this, 'schema.options.versionKey', null);
  if (versionKey && !doc[versionKey]) {
    doc[versionKey] = 0;
  }

  return _update(this, 'replaceOne', conditions, doc, options, callback);
};

/*!
 * Common code for `updateOne()`, `updateMany()`, `replaceOne()`, and `update()`
 * because they need to do the same thing
 */

function _update(model, op, conditions, doc, options, callback) {
  const mq = new model.Query({}, {}, model, model.collection);

  callback = model.$handleCallbackError(callback);
  // gh-2406
  // make local deep copy of conditions
  if (conditions instanceof Document) {
    conditions = conditions.toObject();
  } else {
    conditions = utils.clone(conditions);
  }
  options = typeof options === 'function' ? options : utils.clone(options);

  const versionKey = get(model, 'schema.options.versionKey', null);
  _decorateUpdateWithVersionKey(doc, options, versionKey);

  return mq[op](conditions, doc, options, callback);
}

/**
 * Executes a mapReduce command.
 *
 * `o` is an object specifying all mapReduce options as well as the map and reduce functions. All options are delegated to the driver implementation. See [node-mongodb-native mapReduce() documentation](http://mongodb.github.io/node-mongodb-native/api-generated/collection.html#mapreduce) for more detail about options.
 *
 * This function does not trigger any middleware.
 *
 * ####Example:
 *
 *     var o = {};
 *     // `map()` and `reduce()` are run on the MongoDB server, not Node.js,
 *     // these functions are converted to strings
 *     o.map = function () { emit(this.name, 1) };
 *     o.reduce = function (k, vals) { return vals.length };
 *     User.mapReduce(o, function (err, results) {
 *       console.log(results)
 *     })
 *
 * ####Other options:
 *
 * - `query` {Object} query filter object.
 * - `sort` {Object} sort input objects using this key
 * - `limit` {Number} max number of documents
 * - `keeptemp` {Boolean, default:false} keep temporary data
 * - `finalize` {Function} finalize function
 * - `scope` {Object} scope variables exposed to map/reduce/finalize during execution
 * - `jsMode` {Boolean, default:false} it is possible to make the execution stay in JS. Provided in MongoDB > 2.0.X
 * - `verbose` {Boolean, default:false} provide statistics on job execution time.
 * - `readPreference` {String}
 * - `out*` {Object, default: {inline:1}} sets the output target for the map reduce job.
 *
 * ####* out options:
 *
 * - `{inline:1}` the results are returned in an array
 * - `{replace: 'collectionName'}` add the results to collectionName: the results replace the collection
 * - `{reduce: 'collectionName'}` add the results to collectionName: if dups are detected, uses the reducer / finalize functions
 * - `{merge: 'collectionName'}` add the results to collectionName: if dups exist the new docs overwrite the old
 *
 * If `options.out` is set to `replace`, `merge`, or `reduce`, a Model instance is returned that can be used for further querying. Queries run against this model are all executed with the [`lean` option](/docs/tutorials/lean.html); meaning only the js object is returned and no Mongoose magic is applied (getters, setters, etc).
 *
 * ####Example:
 *
 *     var o = {};
 *     // You can also define `map()` and `reduce()` as strings if your
 *     // linter complains about `emit()` not being defined
 *     o.map = 'function () { emit(this.name, 1) }';
 *     o.reduce = 'function (k, vals) { return vals.length }';
 *     o.out = { replace: 'createdCollectionNameForResults' }
 *     o.verbose = true;
 *
 *     User.mapReduce(o, function (err, model, stats) {
 *       console.log('map reduce took %d ms', stats.processtime)
 *       model.find().where('value').gt(10).exec(function (err, docs) {
 *         console.log(docs);
 *       });
 *     })
 *
 *     // `mapReduce()` returns a promise. However, ES6 promises can only
 *     // resolve to exactly one value,
 *     o.resolveToObject = true;
 *     var promise = User.mapReduce(o);
 *     promise.then(function (res) {
 *       var model = res.model;
 *       var stats = res.stats;
 *       console.log('map reduce took %d ms', stats.processtime)
 *       return model.find().where('value').gt(10).exec();
 *     }).then(function (docs) {
 *        console.log(docs);
 *     }).then(null, handleError).end()
 *
 * @param {Object} o an object specifying map-reduce options
 * @param {Function} [callback] optional callback
 * @see http://www.mongodb.org/display/DOCS/MapReduce
 * @return {Promise}
 * @api public
 */

Model.mapReduce = function mapReduce(o, callback) {
  _checkContext(this, 'mapReduce');

  callback = this.$handleCallbackError(callback);

  return utils.promiseOrCallback(callback, cb => {
    cb = this.$wrapCallback(cb);

    if (!Model.mapReduce.schema) {
      const opts = {noId: true, noVirtualId: true, strict: false};
      Model.mapReduce.schema = new Schema({}, opts);
    }

    if (!o.out) o.out = {inline: 1};
    if (o.verbose !== false) o.verbose = true;

    o.map = String(o.map);
    o.reduce = String(o.reduce);

    if (o.query) {
      let q = new this.Query(o.query);
      q.cast(this);
      o.query = q._conditions;
      q = undefined;
    }

    this.collection.mapReduce(null, null, o, (err, res) => {
      if (err) {
        return cb(err);
      }
      if (res.collection) {
        // returned a collection, convert to Model
        const model = Model.compile('_mapreduce_' + res.collection.collectionName,
          Model.mapReduce.schema, res.collection.collectionName, this.db,
          this.base);

        model._mapreduce = true;
        res.model = model;

        return cb(null, res);
      }

      cb(null, res);
    });
  }, this.events);
};

/**
 * Performs [aggregations](http://docs.mongodb.org/manual/applications/aggregation/) on the models collection.
 *
 * If a `callback` is passed, the `aggregate` is executed and a `Promise` is returned. If a callback is not passed, the `aggregate` itself is returned.
 *
 * This function triggers the following middleware.
 *
 * - `aggregate()`
 *
 * ####Example:
 *
 *     // Find the max balance of all accounts
 *     Users.aggregate([
 *       { $group: { _id: null, maxBalance: { $max: '$balance' }}},
 *       { $project: { _id: 0, maxBalance: 1 }}
 *     ]).
 *     then(function (res) {
 *       console.log(res); // [ { maxBalance: 98000 } ]
 *     });
 *
 *     // Or use the aggregation pipeline builder.
 *     Users.aggregate().
 *       group({ _id: null, maxBalance: { $max: '$balance' } }).
 *       project('-id maxBalance').
 *       exec(function (err, res) {
 *         if (err) return handleError(err);
 *         console.log(res); // [ { maxBalance: 98 } ]
 *       });
 *
 * ####NOTE:
 *
 * - Arguments are not cast to the model's schema because `$project` operators allow redefining the "shape" of the documents at any stage of the pipeline, which may leave documents in an incompatible format.
 * - The documents returned are plain javascript objects, not mongoose documents (since any shape of document can be returned).
 * - Requires MongoDB >= 2.1
 *
 * @see Aggregate #aggregate_Aggregate
 * @see MongoDB http://docs.mongodb.org/manual/applications/aggregation/
 * @param {Array} [pipeline] aggregation pipeline as an array of objects
 * @param {Function} [callback]
 * @return {Aggregate}
 * @api public
 */

Model.aggregate = function aggregate(pipeline, callback) {
  _checkContext(this, 'aggregate');

  if (arguments.length > 2 || get(pipeline, 'constructor.name') === 'Object') {
    throw new MongooseError('Mongoose 5.x disallows passing a spread of operators ' +
      'to `Model.aggregate()`. Instead of ' +
      '`Model.aggregate({ $match }, { $skip })`, do ' +
      '`Model.aggregate([{ $match }, { $skip }])`');
  }

  if (typeof pipeline === 'function') {
    callback = pipeline;
    pipeline = [];
  }

  const aggregate = new Aggregate(pipeline || []);
  aggregate.model(this);

  if (typeof callback === 'undefined') {
    return aggregate;
  }

  callback = this.$handleCallbackError(callback);
  callback = this.$wrapCallback(callback);

  aggregate.exec(callback);
  return aggregate;
};

/**
 * Casts and validates the given object against this model's schema, passing the
 * given `context` to custom validators.
 *
 * ####Example:
 *
 *     const Model = mongoose.model('Test', Schema({
 *       name: { type: String, required: true },
 *       age: { type: Number, required: true }
 *     });
 *
 *     try {
 *       await Model.validate({ name: null }, ['name'])
 *     } catch (err) {
 *       err instanceof mongoose.Error.ValidationError; // true
 *       Object.keys(err.errors); // ['name']
 *     }
 *
 * @param {Object} obj
 * @param {Array} pathsToValidate
 * @param {Object} [context]
 * @param {Function} [callback]
 * @return {Promise|undefined}
 * @api public
 */

Model.validate = function validate(obj, pathsToValidate, context, callback) {
  return utils.promiseOrCallback(callback, cb => {
    const schema = this.schema;
    let paths = Object.keys(schema.paths);

    if (pathsToValidate != null) {
      const _pathsToValidate = new Set(pathsToValidate);
      paths = paths.filter(p => {
        const pieces = p.split('.');
        let cur = pieces[0];
        for (let i = 0; i < pieces.length; ++i) {
          if (_pathsToValidate.has(cur)) {
            return true;
          }
          cur += '.' + pieces[i];
        }
        return _pathsToValidate.has(p);
      });
    }

    let remaining = paths.length;
    let error = null;
    for (const path of paths) {
      const schematype = schema.path(path);
      if (schematype == null) {
        _checkDone();
        continue;
      }

      const pieces = path.split('.');
      let cur = obj;
      for (let i = 0; i < pieces.length - 1; ++i) {
        cur = cur[pieces[i]];
      }

      let val = get(obj, path, void 0);

      if (val != null) {
        try {
          val = schematype.cast(val);
          cur[pieces[pieces.length - 1]] = val;
        } catch (err) {
          error = error || new ValidationError();
          error.addError(path, err);

          _checkDone();
          continue;
        }
      }

      schematype.doValidate(val, err => {
        if (err) {
          error = error || new ValidationError();
          if (err instanceof ValidationError) {
            for (const _err of Object.keys(err.errors)) {
              error.addError(`${path}.${err.errors[_err].path}`, _err);
            }
          } else {
            error.addError(err.path, err);
          }
        }
        _checkDone();
      }, context);
    }

    function _checkDone() {
      if (--remaining <= 0) {
        return cb(error);
      }
    }
  });
};

/**
 * Implements `$geoSearch` functionality for Mongoose
 *
 * This function does not trigger any middleware
 *
 * ####Example:
 *
 *     var options = { near: [10, 10], maxDistance: 5 };
 *     Locations.geoSearch({ type : "house" }, options, function(err, res) {
 *       console.log(res);
 *     });
 *
 * ####Options:
 * - `near` {Array} x,y point to search for
 * - `maxDistance` {Number} the maximum distance from the point near that a result can be
 * - `limit` {Number} The maximum number of results to return
 * - `lean` {Object|Boolean} return the raw object instead of the Mongoose Model
 *
 * @param {Object} conditions an object that specifies the match condition (required)
 * @param {Object} options for the geoSearch, some (near, maxDistance) are required
 * @param {Object|Boolean} [options.lean] if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](/docs/api.html#query_Query-lean) and the [Mongoose lean tutorial](/docs/tutorials/lean.html).
 * @param {Function} [callback] optional callback
 * @return {Promise}
 * @see http://docs.mongodb.org/manual/reference/command/geoSearch/
 * @see http://docs.mongodb.org/manual/core/geohaystack/
 * @api public
 */

Model.geoSearch = function(conditions, options, callback) {
  _checkContext(this, 'geoSearch');

  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  callback = this.$handleCallbackError(callback);

  return utils.promiseOrCallback(callback, cb => {
    cb = this.$wrapCallback(cb);
    let error;
    if (conditions === undefined || !utils.isObject(conditions)) {
      error = new MongooseError('Must pass conditions to geoSearch');
    } else if (!options.near) {
      error = new MongooseError('Must specify the near option in geoSearch');
    } else if (!Array.isArray(options.near)) {
      error = new MongooseError('near option must be an array [x, y]');
    }

    if (error) {
      return cb(error);
    }

    // send the conditions in the options object
    options.search = conditions;

    this.collection.geoHaystackSearch(options.near[0], options.near[1], options, (err, res) => {
      if (err) {
        return cb(err);
      }

      let count = res.results.length;
      if (options.lean || count === 0) {
        return cb(null, res.results);
      }

      const errSeen = false;

      function init(err) {
        if (err && !errSeen) {
          return cb(err);
        }

        if (!--count && !errSeen) {
          cb(null, res.results);
        }
      }

      for (let i = 0; i < res.results.length; ++i) {
        const temp = res.results[i];
        res.results[i] = new this();
        res.results[i].init(temp, {}, init);
      }
    });
  }, this.events);
};

/**
 * Populates document references.
 *
 * ####Available top-level options:
 *
 * - path: space delimited path(s) to populate
 * - select: optional fields to select
 * - match: optional query conditions to match
 * - model: optional name of the model to use for population
 * - options: optional query options like sort, limit, etc
 * - justOne: optional boolean, if true Mongoose will always set `path` to an array. Inferred from schema by default.
 *
 * ####Examples:
 *
 *     // populates a single object
 *     User.findById(id, function (err, user) {
 *       var opts = [
 *         { path: 'company', match: { x: 1 }, select: 'name' },
 *         { path: 'notes', options: { limit: 10 }, model: 'override' }
 *       ];
 *
 *       User.populate(user, opts, function (err, user) {
 *         console.log(user);
 *       });
 *     });
 *
 *     // populates an array of objects
 *     User.find(match, function (err, users) {
 *       var opts = [{ path: 'company', match: { x: 1 }, select: 'name' }];
 *
 *       var promise = User.populate(users, opts);
 *       promise.then(console.log).end();
 *     })
 *
 *     // imagine a Weapon model exists with two saved documents:
 *     //   { _id: 389, name: 'whip' }
 *     //   { _id: 8921, name: 'boomerang' }
 *     // and this schema:
 *     // new Schema({
 *     //   name: String,
 *     //   weapon: { type: ObjectId, ref: 'Weapon' }
 *     // });
 *
 *     var user = { name: 'Indiana Jones', weapon: 389 };
 *     Weapon.populate(user, { path: 'weapon', model: 'Weapon' }, function (err, user) {
 *       console.log(user.weapon.name); // whip
 *     })
 *
 *     // populate many plain objects
 *     var users = [{ name: 'Indiana Jones', weapon: 389 }]
 *     users.push({ name: 'Batman', weapon: 8921 })
 *     Weapon.populate(users, { path: 'weapon' }, function (err, users) {
 *       users.forEach(function (user) {
 *         console.log('%s uses a %s', users.name, user.weapon.name)
 *         // Indiana Jones uses a whip
 *         // Batman uses a boomerang
 *       });
 *     });
 *     // Note that we didn't need to specify the Weapon model because
 *     // it is in the schema's ref
 *
 * @param {Document|Array} docs Either a single document or array of documents to populate.
 * @param {Object} options A hash of key/val (path, options) used for population.
 * @param {boolean} [options.retainNullValues=false] by default, Mongoose removes null and undefined values from populated arrays. Use this option to make `populate()` retain `null` and `undefined` array entries.
 * @param {boolean} [options.getters=false] if true, Mongoose will call any getters defined on the `localField`. By default, Mongoose gets the raw value of `localField`. For example, you would need to set this option to `true` if you wanted to [add a `lowercase` getter to your `localField`](/docs/schematypes.html#schematype-options).
 * @param {boolean} [options.clone=false] When you do `BlogPost.find().populate('author')`, blog posts with the same author will share 1 copy of an `author` doc. Enable this option to make Mongoose clone populated docs before assigning them.
 * @param {Object|Function} [options.match=null] Add an additional filter to the populate query. Can be a filter object containing [MongoDB query syntax](https://docs.mongodb.com/manual/tutorial/query-documents/), or a function that returns a filter object.
 * @param {Boolean} [options.skipInvalidIds=false] By default, Mongoose throws a cast error if `localField` and `foreignField` schemas don't line up. If you enable this option, Mongoose will instead filter out any `localField` properties that cannot be casted to `foreignField`'s schema type.
 * @param {Object} [options.options=null] Additional options like `limit` and `lean`.
 * @param {Function} [callback(err,doc)] Optional callback, executed upon completion. Receives `err` and the `doc(s)`.
 * @return {Promise}
 * @api public
 */

Model.populate = function(docs, paths, callback) {
  _checkContext(this, 'populate');

  const _this = this;

  // normalized paths
  paths = utils.populate(paths);

  // data that should persist across subPopulate calls
  const cache = {};

  callback = this.$handleCallbackError(callback);

  return utils.promiseOrCallback(callback, cb => {
    cb = this.$wrapCallback(cb);
    _populate(_this, docs, paths, cache, cb);
  }, this.events);
};

/*!
 * Populate helper
 *
 * @param {Model} model the model to use
 * @param {Document|Array} docs Either a single document or array of documents to populate.
 * @param {Object} paths
 * @param {Function} [cb(err,doc)] Optional callback, executed upon completion. Receives `err` and the `doc(s)`.
 * @return {Function}
 * @api private
 */

function _populate(model, docs, paths, cache, callback) {
  const length = paths.length;
  let pending = paths.length;

  if (length === 0) {
    return callback(null, docs);
  }

  // each path has its own query options and must be executed separately
  for (let i = 0; i < length; ++i) {
    populate(model, docs, paths[i], next);
  }

  function next(err) {
    if (err) {
      return callback(err, null);
    }
    if (--pending) {
      return;
    }
    callback(null, docs);
  }
}

/*!
 * Populates `docs`
 */
const excludeIdReg = /\s?-_id\s?/;
const excludeIdRegGlobal = /\s?-_id\s?/g;

function populate(model, docs, options, callback) {
  // normalize single / multiple docs passed
  if (!Array.isArray(docs)) {
    docs = [docs];
  }

  if (docs.length === 0 || docs.every(utils.isNullOrUndefined)) {
    return callback();
  }

  const modelsMap = getModelsMapForPopulate(model, docs, options);

  if (modelsMap instanceof MongooseError) {
    return immediate(function() {
      callback(modelsMap);
    });
  }

  const len = modelsMap.length;
  let vals = [];

  function flatten(item) {
    // no need to include undefined values in our query
    return undefined !== item;
  }

  let _remaining = len;
  let hasOne = false;
  const params = [];
  for (let i = 0; i < len; ++i) {
    const mod = modelsMap[i];
    let select = mod.options.select;
    const match = _formatMatch(mod.match);

    let ids = utils.array.flatten(mod.ids, flatten);
    ids = utils.array.unique(ids);

    const assignmentOpts = {};
    assignmentOpts.sort = get(mod, 'options.options.sort', void 0);
    assignmentOpts.excludeId = excludeIdReg.test(select) || (select && select._id === 0);

    if (ids.length === 0 || ids.every(utils.isNullOrUndefined)) {
      // Ensure that we set populate virtuals to 0 or empty array even
      // if we don't actually execute a query because they don't have
      // a value by default. See gh-7731, gh-8230
      --_remaining;
      if (mod.count || mod.isVirtual) {
        _assign(model, [], mod, assignmentOpts);
      }
      continue;
    }

    hasOne = true;
    if (mod.foreignField.size === 1) {
      const foreignField = Array.from(mod.foreignField)[0];
      const foreignSchemaType = mod.model.schema.path(foreignField);
      if (foreignField !== '_id' || !match['_id']) {
        ids = _filterInvalidIds(ids, foreignSchemaType, mod.options.skipInvalidIds);
        match[foreignField] = { $in: ids };
      }
    } else {
      const $or = [];
      if (Array.isArray(match.$or)) {
        match.$and = [{ $or: match.$or }, { $or: $or }];
        delete match.$or;
      } else {
        match.$or = $or;
      }
      for (const foreignField of mod.foreignField) {
        if (foreignField !== '_id' || !match['_id']) {
          const foreignSchemaType = mod.model.schema.path(foreignField);
          ids = _filterInvalidIds(ids, foreignSchemaType, mod.options.skipInvalidIds);
          $or.push({ [foreignField]: { $in: ids } });
        }
      }
    }

    if (assignmentOpts.excludeId) {
      // override the exclusion from the query so we can use the _id
      // for document matching during assignment. we'll delete the
      // _id back off before returning the result.
      if (typeof select === 'string') {
        select = select.replace(excludeIdRegGlobal, ' ');
      } else {
        // preserve original select conditions by copying
        select = utils.object.shallowCopy(select);
        delete select._id;
      }
    }

    if (mod.options.options && mod.options.options.limit) {
      assignmentOpts.originalLimit = mod.options.options.limit;
      mod.options.options.limit = mod.options.options.limit * ids.length;
    }

    params.push([mod, match, select, assignmentOpts, _next]);
  }

  if (!hasOne) {
    return callback();
  }

  for (const arr of params) {
    _execPopulateQuery.apply(null, arr);
  }

  function _next(err, valsFromDb) {
    if (err != null) {
      return callback(err, null);
    }
    vals = vals.concat(valsFromDb);
    if (--_remaining === 0) {
      _done();
    }
  }

  function _done() {
    for (const arr of params) {
      const mod = arr[0];
      const assignmentOpts = arr[3];
      _assign(model, vals, mod, assignmentOpts);
    }
    callback();
  }
}

/*!
 * ignore
 */

function _execPopulateQuery(mod, match, select, assignmentOpts, callback) {
  const subPopulate = utils.clone(mod.options.populate);

  const query = mod.model.find(match, select, mod.options.options);
  // If we're doing virtual populate and projection is inclusive and foreign
  // field is not selected, automatically select it because mongoose needs it.
  // If projection is exclusive and client explicitly unselected the foreign
  // field, that's the client's fault.
  for (const foreignField of mod.foreignField) {
    if (foreignField !== '_id' && query.selectedInclusively() &&
        !isPathSelectedInclusive(query._fields, foreignField)) {
      query.select(foreignField);
    }
  }

  // If using count, still need the `foreignField` so we can match counts
  // to documents, otherwise we would need a separate `count()` for every doc.
  if (mod.count) {
    for (const foreignField of mod.foreignField) {
      query.select(foreignField);
    }
  }

  // If we need to sub-populate, call populate recursively
  if (subPopulate) {
    query.populate(subPopulate);
  }

  query.exec(callback);

  if (mod.options.options && mod.options.options.limit) {
    mod.options.options.limit = assignmentOpts.originalLimit;
  }
}

/*!
 * ignore
 */

function _assign(model, vals, mod, assignmentOpts) {
  const options = mod.options;
  const isVirtual = mod.isVirtual;
  const justOne = mod.justOne;
  let _val;
  const lean = options.options && options.options.lean;
  const len = vals.length;
  const rawOrder = {};
  const rawDocs = {};
  let key;
  let val;

  // Clone because `assignRawDocsToIdStructure` will mutate the array
  const allIds = utils.clone(mod.allIds);

  // optimization:
  // record the document positions as returned by
  // the query result.
  for (let i = 0; i < len; i++) {
    val = vals[i];
    if (val == null) {
      continue;
    }
    for (const foreignField of mod.foreignField) {
      _val = utils.getValue(foreignField, val);
      if (Array.isArray(_val)) {
        _val = utils.array.flatten(_val);
        const _valLength = _val.length;
        for (let j = 0; j < _valLength; ++j) {
          let __val = _val[j];
          if (__val instanceof Document) {
            __val = __val._id;
          }
          key = String(__val);
          if (rawDocs[key]) {
            if (Array.isArray(rawDocs[key])) {
              rawDocs[key].push(val);
              rawOrder[key].push(i);
            } else {
              rawDocs[key] = [rawDocs[key], val];
              rawOrder[key] = [rawOrder[key], i];
            }
          } else {
            if (isVirtual && !justOne) {
              rawDocs[key] = [val];
              rawOrder[key] = [i];
            } else {
              rawDocs[key] = val;
              rawOrder[key] = i;
            }
          }
        }
      } else {
        if (_val instanceof Document) {
          _val = _val._id;
        }
        key = String(_val);
        if (rawDocs[key]) {
          if (Array.isArray(rawDocs[key])) {
            rawDocs[key].push(val);
            rawOrder[key].push(i);
          } else {
            rawDocs[key] = [rawDocs[key], val];
            rawOrder[key] = [rawOrder[key], i];
          }
        } else {
          rawDocs[key] = val;
          rawOrder[key] = i;
        }
      }
      // flag each as result of population
      if (lean) {
        leanPopulateMap.set(val, mod.model);
      } else {
        val.$__.wasPopulated = true;
      }
    }
  }

  assignVals({
    originalModel: model,
    // If virtual, make sure to not mutate original field
    rawIds: mod.isVirtual ? allIds : mod.allIds,
    allIds: allIds,
    foreignField: mod.foreignField,
    rawDocs: rawDocs,
    rawOrder: rawOrder,
    docs: mod.docs,
    path: options.path,
    options: assignmentOpts,
    justOne: mod.justOne,
    isVirtual: mod.isVirtual,
    allOptions: mod,
    lean: lean,
    virtual: mod.virtual,
    count: mod.count,
    match: mod.match
  });
}

/*!
 * Optionally filter out invalid ids that don't conform to foreign field's schema
 * to avoid cast errors (gh-7706)
 */

function _filterInvalidIds(ids, foreignSchemaType, skipInvalidIds) {
  if (!skipInvalidIds) {
    return ids;
  }
  return ids.filter(id => {
    try {
      foreignSchemaType.cast(id);
      return true;
    } catch (err) {
      return false;
    }
  });
}

/*!
 * Format `mod.match` given that it may be an array that we need to $or if
 * the client has multiple docs with match functions
 */

function _formatMatch(match) {
  if (Array.isArray(match)) {
    if (match.length > 1) {
      return { $or: [].concat(match.map(m => Object.assign({}, m))) };
    }
    return Object.assign({}, match[0]);
  }
  return Object.assign({}, match);
}

/*!
 * Compiler utility.
 *
 * @param {String|Function} name model name or class extending Model
 * @param {Schema} schema
 * @param {String} collectionName
 * @param {Connection} connection
 * @param {Mongoose} base mongoose instance
 */

Model.compile = function compile(name, schema, collectionName, connection, base) {
  const versioningEnabled = schema.options.versionKey !== false;

  if (versioningEnabled && !schema.paths[schema.options.versionKey]) {
    // add versioning to top level documents only
    const o = {};
    o[schema.options.versionKey] = Number;
    schema.add(o);
  }

  let model;
  if (typeof name === 'function' && name.prototype instanceof Model) {
    model = name;
    name = model.name;
    schema.loadClass(model, false);
    model.prototype.$isMongooseModelPrototype = true;
  } else {
    // generate new class
    model = function model(doc, fields, skipId) {
      model.hooks.execPreSync('createModel', doc);
      if (!(this instanceof model)) {
        return new model(doc, fields, skipId);
      }
      const discriminatorKey = model.schema.options.discriminatorKey;

      if (model.discriminators == null || doc == null || doc[discriminatorKey] == null) {
        Model.call(this, doc, fields, skipId);
        return;
      }

      // If discriminator key is set, use the discriminator instead (gh-7586)
      const Discriminator = model.discriminators[doc[discriminatorKey]] ||
        getDiscriminatorByValue(model, doc[discriminatorKey]);
      if (Discriminator != null) {
        return new Discriminator(doc, fields, skipId);
      }

      // Otherwise, just use the top-level model
      Model.call(this, doc, fields, skipId);
    };
  }

  model.hooks = schema.s.hooks.clone();
  model.base = base;
  model.modelName = name;

  if (!(model.prototype instanceof Model)) {
    model.__proto__ = Model;
    model.prototype.__proto__ = Model.prototype;
  }
  model.model = function model(name) {
    return this.db.model(name);
  };
  model.db = connection;
  model.prototype.db = connection;
  model.prototype[modelDbSymbol] = connection;
  model.discriminators = model.prototype.discriminators = undefined;
  model[modelSymbol] = true;
  model.events = new EventEmitter();

  model.prototype.$__setSchema(schema);

  const _userProvidedOptions = schema._userProvidedOptions || {};

  // `bufferCommands` is true by default...
  let bufferCommands = true;
  // First, take the global option
  if (connection.base.get('bufferCommands') != null) {
    bufferCommands = connection.base.get('bufferCommands');
  }
  // Connection-specific overrides the global option
  if (connection.config.bufferCommands != null) {
    bufferCommands = connection.config.bufferCommands;
  }
  // And schema options override global and connection
  if (_userProvidedOptions.bufferCommands != null) {
    bufferCommands = _userProvidedOptions.bufferCommands;
  }

  const collectionOptions = {
    bufferCommands: bufferCommands,
    capped: schema.options.capped,
    Promise: model.base.Promise
  };

  model.prototype.collection = connection.collection(
    collectionName,
    collectionOptions
  );
  model.prototype[modelCollectionSymbol] = model.prototype.collection;

  // apply methods and statics
  applyMethods(model, schema);
  applyStatics(model, schema);
  applyHooks(model, schema);
  applyStaticHooks(model, schema.s.hooks, schema.statics);

  model.schema = model.prototype.schema;
  model.collection = model.prototype.collection;

  // Create custom query constructor
  model.Query = function() {
    Query.apply(this, arguments);
  };
  model.Query.prototype = Object.create(Query.prototype);
  model.Query.base = Query.base;
  applyQueryMiddleware(model.Query, model);
  applyQueryMethods(model, schema.query);

  return model;
};

/*!
 * Register custom query methods for this model
 *
 * @param {Model} model
 * @param {Schema} schema
 */

function applyQueryMethods(model, methods) {
  for (const i in methods) {
    model.Query.prototype[i] = methods[i];
  }
}

/*!
 * Subclass this model with `conn`, `schema`, and `collection` settings.
 *
 * @param {Connection} conn
 * @param {Schema} [schema]
 * @param {String} [collection]
 * @return {Model}
 */

Model.__subclass = function subclass(conn, schema, collection) {
  // subclass model using this connection and collection name
  const _this = this;

  const Model = function Model(doc, fields, skipId) {
    if (!(this instanceof Model)) {
      return new Model(doc, fields, skipId);
    }
    _this.call(this, doc, fields, skipId);
  };

  Model.__proto__ = _this;
  Model.prototype.__proto__ = _this.prototype;
  Model.db = conn;
  Model.prototype.db = conn;
  Model.prototype[modelDbSymbol] = conn;

  _this[subclassedSymbol] = _this[subclassedSymbol] || [];
  _this[subclassedSymbol].push(Model);
  if (_this.discriminators != null) {
    Model.discriminators = {};
    for (const key of Object.keys(_this.discriminators)) {
      Model.discriminators[key] = _this.discriminators[key].
        __subclass(_this.db, _this.discriminators[key].schema, collection);
    }
  }

  const s = schema && typeof schema !== 'string'
    ? schema
    : _this.prototype.schema;

  const options = s.options || {};
  const _userProvidedOptions = s._userProvidedOptions || {};

  if (!collection) {
    collection = _this.prototype.schema.get('collection') ||
      utils.toCollectionName(_this.modelName, this.base.pluralize());
  }

  let bufferCommands = true;
  if (s) {
    if (conn.config.bufferCommands != null) {
      bufferCommands = conn.config.bufferCommands;
    }
    if (_userProvidedOptions.bufferCommands != null) {
      bufferCommands = _userProvidedOptions.bufferCommands;
    }
  }
  const collectionOptions = {
    bufferCommands: bufferCommands,
    capped: s && options.capped
  };

  Model.prototype.collection = conn.collection(collection, collectionOptions);
  Model.prototype[modelCollectionSymbol] = Model.prototype.collection;
  Model.collection = Model.prototype.collection;
  // Errors handled internally, so ignore
  Model.init(() => {});
  return Model;
};

Model.$handleCallbackError = function(callback) {
  if (callback == null) {
    return callback;
  }
  if (typeof callback !== 'function') {
    throw new MongooseError('Callback must be a function, got ' + callback);
  }

  const _this = this;
  return function() {
    try {
      callback.apply(null, arguments);
    } catch (error) {
      _this.emit('error', error);
    }
  };
};

/*!
 * ignore
 */

Model.$wrapCallback = function(callback) {
  const timeout = new TimeoutError();

  return function(err) {
    if (err != null && err.name === 'MongoTimeoutError') {
      arguments[0] = timeout;
      timeout.message = err.message;
      Object.assign(timeout, err);
    }

    return callback.apply(null, arguments);
  };
};

/**
 * Helper for console.log. Given a model named 'MyModel', returns the string
 * `'Model { MyModel }'`.
 *
 * ####Example:
 *
 *     const MyModel = mongoose.model('Test', Schema({ name: String }));
 *     MyModel.inspect(); // 'Model { Test }'
 *     console.log(MyModel); // Prints 'Model { Test }'
 *
 * @api public
 */

Model.inspect = function() {
  return `Model { ${this.modelName} }`;
};

if (util.inspect.custom) {
  /*!
  * Avoid Node deprecation warning DEP0079
  */

  Model[util.inspect.custom] = Model.inspect;
}

/*!
 * Module exports.
 */

module.exports = exports = Model;
