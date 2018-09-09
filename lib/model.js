'use strict';

/*!
 * Module dependencies.
 */

const Aggregate = require('./aggregate');
const ChangeStream = require('./cursor/ChangeStream');
const Document = require('./document');
const DocumentNotFoundError = require('./error').DocumentNotFoundError;
const DivergentArrayError = require('./error').DivergentArrayError;
const Error = require('./error');
const EventEmitter = require('events').EventEmitter;
const MongooseMap = require('./types/map');
const OverwriteModelError = require('./error').OverwriteModelError;
const PromiseProvider = require('./promise_provider');
const Query = require('./query');
const Schema = require('./schema');
const VersionError = require('./error').VersionError;
const ParallelSaveError = require('./error').ParallelSaveError;
const applyQueryMiddleware = require('./helpers/query/applyQueryMiddleware');
const applyHooks = require('./helpers/model/applyHooks');
const applyMethods = require('./helpers/model/applyMethods');
const applyStatics = require('./helpers/model/applyStatics');
const applyTimestampsToUpdate = require('./helpers/update/applyTimestampsToUpdate');
const applyWriteConcern = require('./helpers/schema/applyWriteConcern');
const assignRawDocsToIdStructure = require('./helpers/populate/assignRawDocsToIdStructure');
const cast = require('./cast');
const castUpdate = require('./helpers/query/castUpdate');
const discriminator = require('./helpers/model/discriminator');
const getDiscriminatorByValue = require('./queryhelpers').getDiscriminatorByValue;
const immediate = require('./helpers/immediate');
const internalToObjectOptions = require('./options').internalToObjectOptions;
const isPathExcluded = require('./helpers/projection/isPathExcluded');
const isPathSelectedInclusive = require('./helpers/projection/isPathSelectedInclusive');
const get = require('lodash.get');
const getSchemaTypes = require('./helpers/populate/getSchemaTypes');
const getVirtual = require('./helpers/populate/getVirtual');
const modifiedPaths = require('./helpers/update/modifiedPaths');
const mpath = require('mpath');
const parallel = require('async/parallel');
const parallelLimit = require('async/parallelLimit');
const setDefaultsOnInsert = require('./helpers/setDefaultsOnInsert');
const util = require('util');
const utils = require('./utils');

const VERSION_WHERE = 1;
const VERSION_INC = 2;
const VERSION_ALL = VERSION_WHERE | VERSION_INC;

const leanPopulateSymbol = require('./helpers/populate/symbols').leanPopulateSymbol;

/**
 * Model constructor
 *
 * Provides the interface to MongoDB collections as well as creates document instances.
 *
 * @param {Object} doc values with which to create the document
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

/*!
 * ignore
 */

Model.prototype.$__handleSave = function(options, callback) {
  const _this = this;
  let i;
  let keys;
  let len;
  let saveOptions = {};

  _handleSafe(options);
  applyWriteConcern(this.schema, options);
  if ('w' in options) saveOptions.w = options.w;
  if ('j' in options) saveOptions.j = options.j;
  if ('wtimeout' in options) saveOptions.wtimeout = options.wtimeout;

  const session = 'session' in options ? options.session : this.$session();
  if (session != null) {
    saveOptions.session = session;
    this.$session(session);
  }

  if (Object.keys(saveOptions).length === 0) {
    saveOptions = null;
  }

  if (this.isNew) {
    // send entire doc
    const obj = this.toObject(internalToObjectOptions);

    if ((obj || {})._id === void 0) {
      // documents must have an _id else mongoose won't know
      // what to update later if more changes are made. the user
      // wouldn't know what _id was generated by mongodb either
      // nor would the ObjectId generated my mongodb necessarily
      // match the schema definition.
      setTimeout(function() {
        callback(new Error('document must have an _id before saving'));
      }, 0);
      return;
    }

    this.$__version(true, obj);
    this.collection.insertOne(obj, saveOptions, function(err, ret) {
      if (err) {
        _this.isNew = true;
        _this.emit('isNew', true);
        _this.constructor.emit('isNew', true);

        callback(err, null);
        return;
      }

      callback(null, ret);
    });
    this.$__reset();
    this.isNew = false;
    this.emit('isNew', false);
    this.constructor.emit('isNew', false);
    // Make it possible to retry the insert
    this.$__.inserting = true;
  } else {
    // Make sure we don't treat it as a new object on error,
    // since it already exists
    this.$__.inserting = false;

    const delta = this.$__delta();

    if (delta) {
      if (delta instanceof Error) {
        callback(delta);
        return;
      }

      const where = this.$__where(delta[0]);
      if (where instanceof Error) {
        callback(where);
        return;
      }

      if (this.$where) {
        keys = Object.keys(this.$where);
        len = keys.length;
        for (i = 0; i < len; ++i) {
          where[keys[i]] = this.$where[keys[i]];
        }
      }

      this.collection.updateOne(where, delta[1], saveOptions, function(err, ret) {
        if (err) {
          callback(err);
          return;
        }
        ret.$where = where;
        callback(null, ret);
      });
    } else {
      this.$__reset();
      callback();
      return;
    }

    this.emit('isNew', false);
    this.constructor.emit('isNew', false);
  }
};

/*!
 * ignore
 */

Model.prototype.$__save = function(options, callback) {
  this.$__handleSave(options, (error, result) => {
    if (error) {
      return this.schema.s.hooks.execPost('save:error', this, [this], { error: error }, function(error) {
        callback(error);
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
        const version = this.getValue(key) || 0;

        if (numAffected <= 0) {
          // the update failed. pass an error back
          const err = options.$versionError || new VersionError(this, version, modifiedPaths);
          return callback(err);
        }

        // increment version if was successful
        if (doIncrement) {
          this.setValue(key, version + 1);
        }
      }

      if (result != null && numAffected <= 0) {
        error = new DocumentNotFoundError(result.$where);
        return this.schema.s.hooks.execPost('save:error', this, [this], { error: error }, function(error) {
          callback(error);
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
  const version = doc.getValue(key) || 0;
  return new VersionError(doc, version, modifiedPaths);
}

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
 * The callback will receive two parameters
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

  if (options != null) {
    options = utils.clone(options);
  } else {
    options = {};
  }

  if (fn) {
    fn = this.constructor.$wrapCallback(fn);
  }

  options.$versionError = generateVersionError(this, this.modifiedPaths());

  return utils.promiseOrCallback(fn, cb => {
    if (parallelSave) {
      this.$__handleReject(parallelSave);
      return cb(parallelSave);
    }

    this.$__save(options, error => {
      this.$__.saving = undefined;

      if (error) {
        this.$__handleReject(error);
        return cb(error);
      }
      cb(null, this);
    });
  });
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

  let atomics = value._atomics,
      ops = Object.keys(atomics),
      i = ops.length,
      val,
      op;

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
    } else if (value._path && value._atomics) {
      // arrays and other custom types (support plugins etc)
      handleAtomics(this, where, delta, data, value);
    } else if (value._path && Buffer.isBuffer(value)) {
      // MongooseBuffer
      value = value.toObject();
      operand(this, where, delta, data, value);
    } else {
      value = utils.clone(value, {
        depopulate: true,
        transform: false,
        virtuals: false,
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
    const atomics = array._atomics;
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
    if (key) this.setValue(key, delta[key] = 0);
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
    const value = this.getValue(key);
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
    return new Error('No _id found on document!');
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
 * @param {function(err,product)} [fn] optional callback
 * @return {Promise} Promise
 * @api public
 */

Model.prototype.remove = function remove(options, fn) {
  if (typeof options === 'function') {
    fn = options;
    options = undefined;
  }

  if (!options) {
    options = {};
  }

  if (fn) {
    fn = this.constructor.$wrapCallback(fn);
  }

  return utils.promiseOrCallback(fn, cb => {
    this.$__remove(options, cb);
  });
};

/**
 * Alias for remove
 */

Model.prototype.delete = Model.prototype.remove;

/*!
 * ignore
 */

Model.prototype.$__remove = function $__remove(options, cb) {
  if (this.$__.isDeleted) {
    return immediate(() => cb(null, this));
  }

  const where = this.$__where();
  if (where instanceof Error) {
    return cb(where);
  }

  this.collection.deleteOne(where, options, err => {
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
  return this.db.model(name);
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
 * @param {String} value the string stored in the `discriminatorKey` property
 * @api public
 */

Model.discriminator = function(name, schema, value) {
  let model;
  if (typeof name === 'function') {
    model = name;
    name = utils.getFunctionName(model);
    if (!(model.prototype instanceof Model)) {
      throw new Error('The provided class ' + name + ' must extend Model');
    }
  }

  schema = discriminator(this, name, schema, value);
  if (this.db.models[name]) {
    throw new OverwriteModelError(name);
  }

  schema.$isRootDiscriminator = true;

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

  return d;
};

// Model (class) features

/*!
 * Give the constructor the ability to emit events.
 */

for (const i in EventEmitter.prototype) {
  Model[i] = EventEmitter.prototype[i];
}

/**
 * Performs any async initialization of this model against MongoDB. Currently,
 * this function is only responsible for building [indexes](https://docs.mongodb.com/manual/indexes/),
 * unless [`autoIndex`](http://mongoosejs.com/docs/guide.html#autoIndex) is turned off.
 *
 * This function is called automatically, so you don't need to call it.
 * This function is also idempotent, so you may call it to get back a promise
 * that will resolve when your indexes are finished building as an alternative
 * to `MyModel.on('index')`
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
  this.schema.emit('init', this);

  if (this.$init) {
    if (callback) {
      this.$init.then(() => callback(), err => callback(err));
      return null;
    }
    return this.$init;
  }

  const Promise = PromiseProvider.get();
  const autoIndex = this.schema.options.autoIndex;
  this.$init = new Promise((resolve, reject) => {
    if (autoIndex || (autoIndex == null && this.db.config.autoIndex)) {
      const options = { _automatic: true };
      this.ensureIndexes(options, function(error) {
        if (error) {
          return reject(error);
        }
        resolve(this);
      });
    } else {
      resolve(this);
    }
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
 * Makes the indexes in MongoDB match the indexes defined in this model's
 * schema. This function will drop any indexes that are not defined in
 * the model's schema except the `_id` index, and build any indexes that
 * are in your schema but not in MongoDB.
 *
 * @param {Object} [options] options to pass to `ensureIndexes()`
 * @param {Function} [callback] optional callback
 * @return {Promise|undefined} Returns `undefined` if callback is specified, returns a promise if no callback.
 * @api public
 */

Model.syncIndexes = function syncIndexes(options, callback) {
  callback = this.$wrapCallback(callback);

  const dropNonSchemaIndexes = (cb) => {
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
          const key = schemaIndex[0];
          const options = _decorateDiscriminatorIndexOptions(this,
            utils.clone(schemaIndex[1]));

          // If these options are different, need to rebuild the index
          const optionKeys = ['unique', 'partialFilterExpression', 'sparse', 'expireAfterSeconds'];
          const indexCopy = Object.assign({}, index);
          for (const key of optionKeys) {
            if (!(key in options) && !(key in indexCopy)) {
              continue;
            }
            indexCopy[key] = options[key];
          }
          if (utils.deepEqual(key, index.key) &&
              utils.deepEqual(index, indexCopy)) {
            found = true;
            break;
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
  };

  const dropIndexes = (toDrop, cb) => {
    let remaining = toDrop.length;
    let error = false;
    toDrop.forEach(indexName => {
      this.collection.dropIndex(indexName, err => {
        if (err != null) {
          error = true;
          return cb(err);
        }
        if (!error) {
          --remaining || cb(null, toDrop);
        }
      });
    });
  };

  return utils.promiseOrCallback(callback, cb => {
    dropNonSchemaIndexes((err, dropped) => {
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
};

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
  callback = this.$wrapCallback(callback);

  const _listIndexes = cb => {
    this.collection.listIndexes().toArray(cb);
  };

  return utils.promiseOrCallback(callback, cb => {
    // Buffering
    if (this.collection.buffer) {
      this.collection.addQueue(_listIndexes, [cb]);
    } else {
      _listIndexes(cb);
    }
  });
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
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  if (callback) {
    callback = this.$wrapCallback(callback);
  }

  return utils.promiseOrCallback(callback, cb => {
    _ensureIndexes(this, options || {}, error => {
      if (error) {
        return cb(error);
      }
      cb(null);
    });
  });
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

  options = options || {};

  const done = function(err) {
    if (err && !model.$caught) {
      model.emit('error', err);
    }
    model.emit('index', err);
    callback && callback(err);
  };

  for (const index of indexes) {
    const keys = Object.keys(index[0]);
    if (keys.length === 1 && keys[0] === '_id') {
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

    const indexFields = utils.clone(index[0]);
    const indexOptions = utils.clone(index[1]);

    _decorateDiscriminatorIndexOptions(model, indexOptions);
    _handleSafe(options);
    applyWriteConcern(model.schema, indexOptions);

    indexSingleStart(indexFields, options);
    const useCreateIndex = 'createIndex' in options ?
      options.createIndex :
      model.base.options.useCreateIndex;
    const methodName = useCreateIndex ? 'createIndex' : 'ensureIndex';
    model.collection[methodName](indexFields, indexOptions, utils.tick(function(err, name) {
      indexSingleDone(err, indexFields, indexOptions, name);
      if (err) {
        return done(err);
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
    indexOptions.partialFilterExpression = {
      [model.schema.options.discriminatorKey]: model.modelName
    };
  }
  return indexOptions;
}

function _handleSafe(options) {
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
}

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
  const aliases = this.schema.aliases;

  if (typeof fields === 'object') {
    // Fields is an object (query conditions or document fields)
    for (const key in fields) {
      if (aliases[key]) {
        fields[aliases[key]] = fields[key];
        delete fields[key];
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
 *     Character.remove({ name: 'Eddard Stark' }, function (err) {});
 *
 * ####Note:
 *
 * This method sends a remove command directly to MongoDB, no Mongoose documents
 * are involved. Because no Mongoose documents are involved, _no middleware
 * (hooks) are executed_.
 *
 * @param {Object} conditions
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.remove = function remove(conditions, callback) {
  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
  }

  // get the mongodb collection object
  const mq = new this.Query({}, {}, this, this.collection);

  callback = this.$wrapCallback(callback);

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
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.deleteOne = function deleteOne(conditions, callback) {
  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
  }

  // get the mongodb collection object
  const mq = new this.Query(conditions, {}, this, this.collection);

  callback = this.$wrapCallback(callback);

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
  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
    options = null;
  }
  else if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  // get the mongodb collection object
  const mq = new this.Query(conditions, {}, this, this.collection);
  mq.setOptions(options);

  if (callback) {
    callback = this.$wrapCallback(callback);
  }

  return mq.deleteMany(callback);
};

/**
 * Finds documents
 *
 * The `conditions` are cast to their respective SchemaTypes before the command is sent.
 *
 * ####Examples:
 *
 *     // named john and at least 18
 *     MyModel.find({ name: 'john', age: { $gte: 18 }});
 *
 *     // executes immediately, passing results to callback
 *     MyModel.find({ name: 'john', age: { $gte: 18 }}, function (err, docs) {});
 *
 *     // name LIKE john and only selecting the "name" and "friends" fields, executing immediately
 *     MyModel.find({ name: /john/i }, 'name friends', function (err, docs) { })
 *
 *     // passing options
 *     MyModel.find({ name: /john/i }, null, { skip: 10 })
 *
 *     // passing options and executing immediately
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
 * @param {Object} conditions
 * @param {Object|String} [projection] optional fields to return, see [`Query.prototype.select()`](#query_Query-select)
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback]
 * @return {Query}
 * @see field selection #query_Query-select
 * @see promise #promise-js
 * @api public
 */

Model.find = function find(conditions, projection, options, callback) {
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

  if (callback) {
    callback = this.$wrapCallback(callback);
  }

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
 *     // find adventure by id and execute immediately
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
 * @param {Object|String|Number} id value of `_id` to query by
 * @param {Object|String} [projection] optional fields to return, see [`Query.prototype.select()`](#query_Query-select)
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback]
 * @return {Query}
 * @see field selection #query_Query-select
 * @see lean queries #query_Query-lean
 * @api public
 */

Model.findById = function findById(id, projection, options, callback) {
  if (typeof id === 'undefined') {
    id = null;
  }

  if (callback) {
    callback = this.$wrapCallback(callback);
  }

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
 * @see lean queries #query_Query-lean
 * @api public
 */

Model.findOne = function findOne(conditions, projection, options, callback) {
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

  // get the mongodb collection object
  const mq = new this.Query({}, {}, this, this.collection);
  mq.select(projection);
  mq.setOptions(options);
  if (this.schema.discriminatorMapping &&
      this.schema.discriminatorMapping.isRoot &&
      mq.selectedInclusively()) {
    mq.select(this.schema.options.discriminatorKey);
  }

  if (callback) {
    callback = this.$wrapCallback(callback);
  }

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
  // get the mongodb collection object
  const mq = new this.Query({}, {}, this, this.collection);

  callback = this.$wrapCallback(callback);

  return mq.estimatedDocumentCount(options, callback);
};

/**
 * Counts number of documents matching `filter` in a database collection.
 *
 * If you want to count all documents in a large collection,
 * use the [`estimatedDocumentCount()` function](/docs/api.html#model_Model.estimatedDocumentCount)
 * instead. If you call `countDocuments({})`, MongoDB will always execute
 * a full collection scan and **not** use any indexes.
 *
 * ####Example:
 *
 *     Adventure.countDocuments({ type: 'jungle' }, function (err, count) {
 *       console.log('there are %d jungle adventures', count);
 *     });
 *
 * @param {Object} filter
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.countDocuments = function countDocuments(conditions, callback) {
  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
  }

  // get the mongodb collection object
  const mq = new this.Query({}, {}, this, this.collection);

  callback = this.$wrapCallback(callback);

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
  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
  }

  // get the mongodb collection object
  const mq = new this.Query({}, {}, this, this.collection);

  if (callback) {
    callback = this.$wrapCallback(callback);
  }

  return mq.count(conditions, callback);
};

/**
 * Creates a Query for a `distinct` operation.
 *
 * Passing a `callback` immediately executes the query.
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
  // get the mongodb collection object
  const mq = new this.Query({}, {}, this, this.collection);

  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
  }
  if (callback) {
    callback = this.$wrapCallback(callback);
  }

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
  void val; // eslint
  // get the mongodb collection object
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
  const mq = new this.Query({}, {}, this, this.collection).find({});
  return mq.$where.apply(mq, arguments);
};

/**
 * Issues a mongodb findAndModify update command.
 *
 * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback. The query executes immediately if `callback` is passed else a Query object is returned.
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
 * @param {Object} [options.lean] if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](http://mongoosejs.com/docs/api.html#query_Query-lean).
 * @param {Function} [callback]
 * @return {Query}
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @api public
 */

Model.findOneAndUpdate = function(conditions, update, options, callback) {
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
  if (callback) {
    callback = this.$wrapCallback(callback);
  }

  let fields;
  if (options) {
    fields = options.fields || options.projection;
  }

  const retainKeyOrder = get(options, 'retainKeyOrder') ||
    get(this, 'schema.options.retainKeyOrder') ||
    false;
  update = utils.clone(update, {
    depopulate: true,
    _isNested: true,
    retainKeyOrder: retainKeyOrder
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
  if (versionKey && get(options, 'upsert', false)) {
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
}

/**
 * Issues a mongodb findAndModify update command by a document's _id field.
 * `findByIdAndUpdate(id, ...)` is equivalent to `findOneAndUpdate({ _id: id }, ...)`.
 *
 * Finds a matching document, updates it according to the `update` arg,
 * passing any `options`, and returns the found document (if any) to the
 * callback. The query executes immediately if `callback` is passed else a
 * Query object is returned.
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
 * @param {Object} [options.lean] if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](http://mongoosejs.com/docs/api.html#query_Query-lean).
 * @param {Function} [callback]
 * @return {Query}
 * @see Model.findOneAndUpdate #model_Model.findOneAndUpdate
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @api public
 */

Model.findByIdAndUpdate = function(id, update, options, callback) {
  if (callback) {
    callback = this.$wrapCallback(callback);
  }
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
 * Executes immediately if `callback` is passed else a Query object is returned.
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
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.findOneAndDelete = function(conditions, options, callback) {
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
  if (callback) {
    callback = this.$wrapCallback(callback);
  }

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
 * @param {Function} [callback]
 * @return {Query}
 * @see Model.findOneAndRemove #model_Model.findOneAndRemove
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 */

Model.findByIdAndDelete = function(id, options, callback) {
  if (arguments.length === 1 && typeof id === 'function') {
    const msg = 'Model.findByIdAndDelete(): First argument must not be a function.\n\n'
        + '  ' + this.modelName + '.findByIdAndDelete(id, callback)\n'
        + '  ' + this.modelName + '.findByIdAndDelete(id)\n'
        + '  ' + this.modelName + '.findByIdAndDelete()\n';
    throw new TypeError(msg);
  }
  if (callback) {
    callback = this.$wrapCallback(callback);
  }

  return this.findOneAndDelete({_id: id}, options, callback);
};

/**
 * Issue a mongodb findAndModify remove command.
 *
 * Finds a matching document, removes it, passing the found document (if any) to the callback.
 *
 * Executes immediately if `callback` is passed else a Query object is returned.
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
 * @param {Function} [callback]
 * @return {Query}
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @api public
 */

Model.findOneAndRemove = function(conditions, options, callback) {
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
  if (callback) {
    callback = this.$wrapCallback(callback);
  }

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
 * Executes immediately if `callback` is passed, else a `Query` object is returned.
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
 * @param {Function} [callback]
 * @return {Query}
 * @see Model.findOneAndRemove #model_Model.findOneAndRemove
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 */

Model.findByIdAndRemove = function(id, options, callback) {
  if (arguments.length === 1 && typeof id === 'function') {
    const msg = 'Model.findByIdAndRemove(): First argument must not be a function.\n\n'
        + '  ' + this.modelName + '.findByIdAndRemove(id, callback)\n'
        + '  ' + this.modelName + '.findByIdAndRemove(id)\n'
        + '  ' + this.modelName + '.findByIdAndRemove()\n';
    throw new TypeError(msg);
  }
  if (callback) {
    callback = this.$wrapCallback(callback);
  }

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
  }

  if (cb) {
    cb = this.$wrapCallback(cb);
  }

  return utils.promiseOrCallback(cb, cb => {
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
          throw new Error(`Discriminator "${doc[discriminatorKey]}" not ` +
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

    parallel(toExecute, (error, res) => {
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
    });
  });
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
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  return utils.promiseOrCallback(callback, cb => {
    this.$__insertMany(arr, options, cb);
  });
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
        doc = new _this(doc);
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
        docAttributes[i].isNew = false;
        docAttributes[i].emit('isNew', false);
        docAttributes[i].constructor.emit('isNew', false);
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
 *     ]).then(handleResult);
 *
 * @param {Array} ops
 * @param {Object} [options]
 * @param {Function} [callback] callback `function(error, bulkWriteOpResult) {}`
 * @return {Promise} resolves to a `BulkWriteOpResult` if the operation succeeds
 * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~BulkWriteOpResult
 * @api public
 */

Model.bulkWrite = function(ops, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  if (callback) {
    callback = this.$wrapCallback(callback);
  }
  options = options || {};

  const validations = ops.map((op) => {
    if (op['insertOne']) {
      return (callback) => {
        op['insertOne']['document'] = new this(op['insertOne']['document']);
        op['insertOne']['document'].validate({ __noPromise: true }, function(error) {
          if (error) {
            return callback(error, null);
          }
          callback(null);
        });
      };
    } else if (op['updateOne']) {
      op = op['updateOne'];
      return (callback) => {
        try {
          op['filter'] = cast(this.schema, op['filter']);
          op['update'] = castUpdate(this.schema, op['update'],
            this.schema.options.strict);
          if (op.setDefaultsOnInsert) {
            setDefaultsOnInsert(op['filter'], this.schema, op['update'], {
              setDefaultsOnInsert: true,
              upsert: op.upsert
            });
          }
          if (this.schema.$timestamps != null) {
            const createdAt = this.schema.$timestamps.createdAt;
            const updatedAt = this.schema.$timestamps.updatedAt;
            const inPlace = true;
            const overwrite = false;
            applyTimestampsToUpdate(createdAt, updatedAt, op['update'],
              overwrite, inPlace);
          }
        } catch (error) {
          return callback(error, null);
        }

        callback(null);
      };
    } else if (op['updateMany']) {
      op = op['updateMany'];
      return (callback) => {
        try {
          op['filter'] = cast(this.schema, op['filter']);
          op['update'] = castUpdate(this.schema, op['update'], {
            strict: this.schema.options.strict,
            overwrite: false
          });
          if (op.setDefaultsOnInsert) {
            setDefaultsOnInsert(op['filter'], this.schema, op['update'], {
              setDefaultsOnInsert: true,
              upsert: op.upsert
            });
          }
          if (this.schema.$timestamps != null) {
            const createdAt = this.schema.$timestamps.createdAt;
            const updatedAt = this.schema.$timestamps.updatedAt;
            const inPlace = true;
            const overwrite = false;
            applyTimestampsToUpdate(createdAt, updatedAt, op['update'],
              overwrite, inPlace);
          }
        } catch (error) {
          return callback(error, null);
        }

        callback(null);
      };
    } else if (op['replaceOne']) {
      return (callback) => {
        try {
          op['replaceOne']['filter'] = cast(this.schema,
            op['replaceOne']['filter']);
        } catch (error) {
          return callback(error, null);
        }

        // set `skipId`, otherwise we get "_id field cannot be changed"
        op['replaceOne']['replacement'] =
          new this(op['replaceOne']['replacement'], null, true);
        op['replaceOne']['replacement'].validate({ __noPromise: true }, function(error) {
          if (error) {
            return callback(error, null);
          }
          callback(null);
        });
      };
    } else if (op['deleteOne']) {
      return (callback) => {
        try {
          op['deleteOne']['filter'] = cast(this.schema,
            op['deleteOne']['filter']);
        } catch (error) {
          return callback(error, null);
        }

        callback(null);
      };
    } else if (op['deleteMany']) {
      return (callback) => {
        try {
          op['deleteMany']['filter'] = cast(this.schema,
            op['deleteMany']['filter']);
        } catch (error) {
          return callback(error, null);
        }

        callback(null);
      };
    } else {
      return (callback) => {
        callback(new Error('Invalid op passed to `bulkWrite()`'), null);
      };
    }
  });

  return utils.promiseOrCallback(callback, cb => {
    parallel(validations, error => {
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
  });
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
 * @return {Model} document instance
 * @api public
 */

Model.hydrate = function(obj) {
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
 *     MyModel.update({ name: 'Tobi' }, { ferret: true }, { multi: true }, function (err, raw) {
 *       if (err) return handleError(err);
 *       console.log('The raw response from Mongo was ', raw);
 *     });
 *
 * ####Valid options:
 *
 *  - `safe` (boolean) safe mode (defaults to value set in schema (true))
 *  - `upsert` (boolean) whether to create the doc if it doesn't match (false)
 *  - `multi` (boolean) whether multiple documents should be updated (false)
 *  - `runValidators`: if true, runs [update validators](/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
 *  - `setDefaultsOnInsert`: if this and `upsert` are true, mongoose will apply the [defaults](http://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created. This option only works on MongoDB >= 2.4 because it relies on [MongoDB's `$setOnInsert` operator](https://docs.mongodb.org/v2.4/reference/operator/update/setOnInsert/).
 *  - `strict` (boolean) overrides the `strict` option for this update
 *  - `overwrite` (boolean) disables update-only mode, allowing you to overwrite the doc (false)
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
 *     Model.update(query, { name: 'jason bourne' }, options, callback)
 *
 *     // is sent as
 *     Model.update(query, { $set: { name: 'jason bourne' }}, options, callback)
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
 * To update documents without waiting for a response from MongoDB, do not pass a `callback`, then call `exec` on the returned [Query](#query-js):
 *
 *     Comment.update({ _id: id }, { $set: { text: 'changed' }}).exec();
 *
 * ####Note:
 *
 * Although values are casted to their appropriate types when using update, the following are *not* applied:
 *
 * - defaults
 * - setters
 * - validators
 * - middleware
 *
 * If you need those features, use the traditional approach of first retrieving the document.
 *
 *     Model.findOne({ name: 'borne' }, function (err, doc) {
 *       if (err) ..
 *       doc.name = 'jason bourne';
 *       doc.save(callback);
 *     })
 *
 * @see strict http://mongoosejs.com/docs/guide.html#strict
 * @see response http://docs.mongodb.org/v2.6/reference/command/update/#output
 * @param {Object} conditions
 * @param {Object} doc
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.update = function update(conditions, doc, options, callback) {
  return _update(this, 'update', conditions, doc, options, callback);
};

/**
 * Same as `update()`, except MongoDB will update _all_ documents that match
 * `criteria` (as opposed to just the first one) regardless of the value of
 * the `multi` option.
 *
 * **Note** updateMany will _not_ fire update middleware. Use `pre('updateMany')`
 * and `post('updateMany')` instead.
 *
 * This function triggers the following middleware.
 *
 * - `updateMany()`
 *
 * @param {Object} conditions
 * @param {Object} doc
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.updateMany = function updateMany(conditions, doc, options, callback) {
  return _update(this, 'updateMany', conditions, doc, options, callback);
};

/**
 * Same as `update()`, except it does not support the `multi` or `overwrite`
 * options.
 *
 * - MongoDB will update _only_ the first document that matches `criteria` regardless of the value of the `multi` option.
 * - Use `replaceOne()` if you want to overwrite an entire document rather than using atomic operators like `$set`.
 *
 * This function triggers the following middleware.
 *
 * - `updateOne()`
 *
 * @param {Object} conditions
 * @param {Object} doc
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.updateOne = function updateOne(conditions, doc, options, callback) {
  return _update(this, 'updateOne', conditions, doc, options, callback);
};

/**
 * Same as `update()`, except MongoDB replace the existing document with the
 * given document (no atomic operators like `$set`).
 *
 * This function triggers the following middleware.
 *
 * - `replaceOne()`
 *
 * @param {Object} conditions
 * @param {Object} doc
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.replaceOne = function replaceOne(conditions, doc, options, callback) {
  return _update(this, 'replaceOne', conditions, doc, options, callback);
};

/*!
 * Common code for `updateOne()`, `updateMany()`, `replaceOne()`, and `update()`
 * because they need to do the same thing
 */

function _update(model, op, conditions, doc, options, callback) {
  const mq = new model.Query({}, {}, model, model.collection);
  if (callback) {
    callback = model.$wrapCallback(callback);
  }
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
 * If `options.out` is set to `replace`, `merge`, or `reduce`, a Model instance is returned that can be used for further querying. Queries run against this model are all executed with the `lean` option; meaning only the js object is returned and no Mongoose magic is applied (getters, setters, etc).
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
  if (callback) {
    callback = this.$wrapCallback(callback);
  }
  return utils.promiseOrCallback(callback, cb => {
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
  });
};

/**
 * Performs [aggregations](http://docs.mongodb.org/manual/applications/aggregation/) on the models collection.
 *
 * If a `callback` is passed, the `aggregate` is executed and a `Promise` is returned. If a callback is not passed, the `aggregate` itself is returned.
 *
 * This function does not trigger any middleware.
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
  if (arguments.length > 2 || get(pipeline, 'constructor.name') === 'Object') {
    throw new Error('Mongoose 5.x disallows passing a spread of operators ' +
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

  if (callback) {
    callback = this.$wrapCallback(callback);
  }

  aggregate.exec(callback);
  return aggregate;
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
 * - `lean` {Boolean} return the raw object instead of the Mongoose Model
 *
 * @param {Object} conditions an object that specifies the match condition (required)
 * @param {Object} options for the geoSearch, some (near, maxDistance) are required
 * @param {Object} [options.lean] if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](http://mongoosejs.com/docs/api.html#query_Query-lean).
 * @param {Function} [callback] optional callback
 * @return {Promise}
 * @see http://docs.mongodb.org/manual/reference/command/geoSearch/
 * @see http://docs.mongodb.org/manual/core/geohaystack/
 * @api public
 */

Model.geoSearch = function(conditions, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (callback) {
    callback = this.$wrapCallback(callback);
  }

  return utils.promiseOrCallback(callback, cb => {
    let error;
    if (conditions === undefined || !utils.isObject(conditions)) {
      error = new Error('Must pass conditions to geoSearch');
    } else if (!options.near) {
      error = new Error('Must specify the near option in geoSearch');
    } else if (!Array.isArray(options.near)) {
      error = new Error('near option must be an array [x, y]');
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
  });
};

/**
 * Populates document references.
 *
 * ####Available options:
 *
 * - path: space delimited path(s) to populate
 * - select: optional fields to select
 * - match: optional query conditions to match
 * - model: optional name of the model to use for population
 * - options: optional query options like sort, limit, etc
 *
 * ####Examples:
 *
 *     // populates a single object
 *     User.findById(id, function (err, user) {
 *       var opts = [
 *           { path: 'company', match: { x: 1 }, select: 'name' }
 *         , { path: 'notes', options: { limit: 10 }, model: 'override' }
 *       ]
 *
 *       User.populate(user, opts, function (err, user) {
 *         console.log(user);
 *       });
 *     });
 *
 *     // populates an array of objects
 *     User.find(match, function (err, users) {
 *       var opts = [{ path: 'company', match: { x: 1 }, select: 'name' }]
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
 *     var user = { name: 'Indiana Jones', weapon: 389 }
 *     Weapon.populate(user, { path: 'weapon', model: 'Weapon' }, function (err, user) {
 *       console.log(user.weapon.name) // whip
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
 * @param {Function} [callback(err,doc)] Optional callback, executed upon completion. Receives `err` and the `doc(s)`.
 * @return {Promise}
 * @api public
 */

Model.populate = function(docs, paths, callback) {
  const _this = this;
  if (callback) {
    callback = this.$wrapCallback(callback);
  }

  // normalized paths
  paths = utils.populate(paths);

  // data that should persist across subPopulate calls
  const cache = {};

  return utils.promiseOrCallback(callback, cb => {
    _populate(_this, docs, paths, cache, cb);
  });
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
  let pending = paths.length;

  if (pending === 0) {
    return callback(null, docs);
  }

  // each path has its own query options and must be executed separately
  let i = pending;
  let path;
  while (i--) {
    path = paths[i];
    populate(model, docs, path, next);
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

  if (modelsMap instanceof Error) {
    return immediate(function() {
      callback(modelsMap);
    });
  }

  const len = modelsMap.length;
  let mod;
  let match;
  let select;
  let vals = [];

  function flatten(item) {
    // no need to include undefined values in our query
    return undefined !== item;
  }

  let _remaining = len;
  let hasOne = false;
  for (let i = 0; i < len; ++i) {
    mod = modelsMap[i];
    select = mod.options.select;

    if (mod.options.match) {
      match = utils.object.shallowCopy(mod.options.match);
    } else if (get(mod, 'options.options.match')) {
      match = utils.object.shallowCopy(mod.options.options.match);
      delete mod.options.options.match;
    } else {
      match = {};
    }

    let ids = utils.array.flatten(mod.ids, flatten);
    ids = utils.array.unique(ids);

    if (ids.length === 0 || ids.every(utils.isNullOrUndefined)) {
      --_remaining;
      continue;
    }

    hasOne = true;
    if (mod.foreignField !== '_id' || !match['_id']) {
      match[mod.foreignField] = { $in: ids };
    }

    const assignmentOpts = {};
    assignmentOpts.sort = get(mod, 'options.options.sort', void 0);
    assignmentOpts.excludeId = excludeIdReg.test(select) || (select && select._id === 0);

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

    const subPopulate = utils.clone(mod.options.populate);
    const query = mod.Model.find(match, select, mod.options.options);

    // If we're doing virtual populate and projection is inclusive and foreign
    // field is not selected, automatically select it because mongoose needs it.
    // If projection is exclusive and client explicitly unselected the foreign
    // field, that's the client's fault.
    if (mod.foreignField !== '_id' && query.selectedInclusively() &&
      !isPathSelectedInclusive(query._fields, mod.foreignField)) {
      query.select(mod.foreignField);
    }

    // If we need to sub-populate, call populate recursively
    if (subPopulate) {
      query.populate(subPopulate);
    }

    query.exec(next.bind(this, mod, assignmentOpts));
  }

  if (!hasOne) {
    return callback();
  }

  function next(options, assignmentOpts, err, valsFromDb) {
    if (mod.options.options && mod.options.options.limit) {
      mod.options.options.limit = assignmentOpts.originalLimit;
    }

    if (err) return callback(err, null);
    vals = vals.concat(valsFromDb);
    _assign(null, vals, options, assignmentOpts);
    if (--_remaining === 0) {
      callback();
    }
  }

  function _assign(err, vals, mod, assignmentOpts) {
    if (err) {
      return callback(err, null);
    }

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
      if (val) {
        _val = utils.getValue(mod.foreignField, val);
        if (Array.isArray(_val)) {
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
          val[leanPopulateSymbol] = mod.Model;
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
      localField: mod.localField,
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
      virtual: mod.virtual
    });
  }
}

/*!
 * Assigns documents returned from a population query back
 * to the original document path.
 */

function assignVals(o) {
  // Glob all options together because `populateOptions` is confusing
  const retainNullValues = get(o, 'allOptions.options.options.retainNullValues', false);
  const populateOptions = Object.assign({}, o.options, {
    justOne: o.justOne,
    retainNullValues: retainNullValues
  });

  // replace the original ids in our intermediate _ids structure
  // with the documents found by query
  assignRawDocsToIdStructure(o.rawIds, o.rawDocs, o.rawOrder, populateOptions);

  // now update the original documents being populated using the
  // result structure that contains real documents.
  const docs = o.docs;
  const rawIds = o.rawIds;
  const options = o.options;

  function setValue(val) {
    return valueFilter(val, options, populateOptions);
  }

  for (let i = 0; i < docs.length; ++i) {
    const existingVal = utils.getValue(o.path, docs[i]);
    if (existingVal == null && !getVirtual(o.originalModel.schema, o.path)) {
      continue;
    }

    // If we're populating a map, the existing value will be an object, so
    // we need to transform again
    const originalSchema = o.originalModel.schema;
    let isMap = isModel(docs[i]) ?
      existingVal instanceof Map :
      utils.isPOJO(existingVal);
    // If we pass the first check, also make sure the local field's schematype
    // is map (re: gh-6460)
    isMap = isMap && get(originalSchema._getSchema(o.path), '$isSchemaMap');
    if (!o.isVirtual && isMap) {
      const _keys = existingVal instanceof Map ?
        Array.from(existingVal.keys()) :
        Object.keys(existingVal);
      rawIds[i] = rawIds[i].reduce((cur, v, i) => {
        // Avoid casting because that causes infinite recursion
        cur.$init(_keys[i], v);
        return cur;
      }, new MongooseMap({}, docs[i]));
    }

    if (o.isVirtual && docs[i].constructor.name === 'model') {
      // If virtual populate and doc is already init-ed, need to walk through
      // the actual doc to set rather than setting `_doc` directly
      mpath.set(o.path, rawIds[i], docs[i], setValue);
      continue;
    }

    const parts = o.path.split('.');
    let cur = docs[i];
    for (let j = 0; j < parts.length - 1; ++j) {
      if (cur[parts[j]] == null) {
        cur[parts[j]] = {};
      }
      cur = cur[parts[j]];
    }
    if (docs[i].$__) {
      docs[i].populated(o.path, o.allIds[i], o.allOptions);
    }

    // If lean, need to check that each individual virtual respects
    // `justOne`, because you may have a populated virtual with `justOne`
    // underneath an array. See gh-6867
    utils.setValue(o.path, rawIds[i], docs[i], function(v) {
      if (o.justOne === true && Array.isArray(v)) {
        return setValue(v[0]);
      } else if (o.justOne === false && !Array.isArray(v)) {
        return setValue([v]);
      }
      return setValue(v);
    }, false);
  }
}

/*!
 * Check if obj is a document
 */

function isModel(obj) {
  return get(obj, '$__') != null;
}

function getModelsMapForPopulate(model, docs, options) {
  let i;
  let doc;
  const len = docs.length;
  const available = {};
  const map = [];
  const modelNameFromQuery = options.model && options.model.modelName || options.model;
  let schema;
  let refPath;
  let Model;
  let currentOptions;
  let modelNames;
  let modelName;
  let discriminatorKey;
  let modelForFindSchema;

  const originalModel = options.model;
  let isVirtual = false;
  const modelSchema = model.schema;

  for (i = 0; i < len; i++) {
    doc = docs[i];

    schema = getSchemaTypes(modelSchema, doc, options.path);
    const isUnderneathDocArray = schema && schema.$isUnderneathDocArray;
    if (isUnderneathDocArray && get(options, 'options.sort') != null) {
      return new Error('Cannot populate with `sort` on path ' + options.path +
        ' because it is a subproperty of a document array');
    }

    modelNames = null;
    let isRefPath = false;
    if (Array.isArray(schema)) {
      for (let j = 0; j < schema.length; ++j) {
        var _modelNames;
        try {
          const res = _getModelNames(doc, schema[j]);
          _modelNames = res.modelNames;
          isRefPath = res.isRefPath;
        } catch (error) {
          return error;
        }
        if (!_modelNames) {
          continue;
        }
        modelNames = modelNames || [];
        for (let x = 0; x < _modelNames.length; ++x) {
          if (modelNames.indexOf(_modelNames[x]) === -1) {
            modelNames.push(_modelNames[x]);
          }
        }
      }
    } else {
      try {
        const res = _getModelNames(doc, schema);
        modelNames = res.modelNames;
        isRefPath = res.isRefPath;
      } catch (error) {
        return error;
      }

      if (!modelNames) {
        continue;
      }
    }

    const virtual = getVirtual(model.schema, options.path);
    let localField;
    if (virtual && virtual.options) {
      const virtualPrefix = virtual.$nestedSchemaPath ?
        virtual.$nestedSchemaPath + '.' : '';
      if (typeof virtual.options.localField === 'function') {
        localField = virtualPrefix + virtual.options.localField.call(doc, doc);
      } else {
        localField = virtualPrefix + virtual.options.localField;
      }
    } else {
      localField = options.path;
    }
    let foreignField = virtual && virtual.options ?
      virtual.options.foreignField :
      '_id';

    // `justOne = null` means we don't know from the schema whether the end
    // result should be an array or a single doc. This can result from
    // populating a POJO using `Model.populate()`
    let justOne = null;
    if (virtual && virtual.options && virtual.options.ref) {
      let normalizedRef;
      if (typeof virtual.options.ref === 'function') {
        normalizedRef = virtual.options.ref.call(doc, doc);
      } else {
        normalizedRef = virtual.options.ref;
      }
      justOne = virtual.options.justOne;
      isVirtual = true;
      if (!modelNames) {
        modelNames = [].concat(normalizedRef);
      }
    } else if (schema) {
      justOne = !schema.$isMongooseArray;
    }

    if (!modelNames) {
      continue;
    }

    if (virtual && (!localField || !foreignField)) {
      return new Error('If you are populating a virtual, you must set the ' +
        'localField and foreignField options');
    }

    options.isVirtual = isVirtual;
    options.virtual = virtual;
    if (typeof localField === 'function') {
      localField = localField.call(doc, doc);
    }
    if (typeof foreignField === 'function') {
      foreignField = foreignField.call(doc);
    }

    const localFieldPath = modelSchema.paths[localField];
    const localFieldGetters = localFieldPath ? localFieldPath.getters : [];
    let ret;

    const _populateOptions = get(options, 'options', {});

    const getters = 'getters' in _populateOptions ?
      _populateOptions.getters :
      options.isVirtual && get(virtual, 'options.getters', false);
    if (localFieldGetters.length > 0 && getters) {
      const hydratedDoc = (doc.$__ != null) ? doc : model.hydrate(doc);
      ret = localFieldPath.applyGetters(doc[localField], hydratedDoc);
    } else {
      ret = convertTo_id(utils.getValue(localField, doc));
    }

    const id = String(utils.getValue(foreignField, doc));
    options._docs[id] = Array.isArray(ret) ? ret.slice() : ret;

    let k = modelNames.length;
    while (k--) {
      modelName = modelNames[k];
      if (modelName == null) {
        continue;
      }
      try {
        Model = originalModel && originalModel.modelName ?
          originalModel :
          model.db.model(modelName);
      } catch (error) {
        return error;
      }

      let ids = ret;
      const flat = Array.isArray(ret) ? utils.array.flatten(ret) : [];
      if (isRefPath && Array.isArray(ret) && flat.length === modelNames.length) {
        ids = flat.filter((val, i) => modelNames[i] === modelName);
      }

      if (!available[modelName]) {
        currentOptions = {
          model: Model
        };

        if (isVirtual && virtual.options && virtual.options.options) {
          currentOptions.options = utils.clone(virtual.options.options);
        }
        utils.merge(currentOptions, options);
        if (schema && !discriminatorKey) {
          currentOptions.model = Model;
        }
        options.model = Model;

        available[modelName] = {
          Model: Model,
          options: currentOptions,
          docs: [doc],
          ids: [ids],
          allIds: [ret],
          // Assume only 1 localField + foreignField
          localField: localField,
          foreignField: foreignField,
          justOne: justOne,
          isVirtual: isVirtual,
          virtual: virtual
        };
        map.push(available[modelName]);
      } else {
        available[modelName].docs.push(doc);
        available[modelName].ids.push(ids);
        available[modelName].allIds.push(ret);
      }
    }
  }

  function _getModelNames(doc, schema) {
    let modelNames;
    let discriminatorKey;
    let isRefPath = false;

    if (schema && schema.caster) {
      schema = schema.caster;
    }
    if (schema && schema.$isSchemaMap) {
      schema = schema.$__schemaType;
    }

    if (!schema && model.discriminators) {
      discriminatorKey = model.schema.discriminatorMapping.key;
    }

    refPath = schema && schema.options && schema.options.refPath;

    let normalizedRefPath;

    if (refPath && typeof refPath === 'function') {
      normalizedRefPath = refPath.call(doc, doc, options.path);
    } else {
      normalizedRefPath = refPath;
    }

    if (normalizedRefPath) {
      if (options._queryProjection != null && isPathExcluded(options._queryProjection, normalizedRefPath)) {
        throw new Error('refPath `' + normalizedRefPath +
          '` must not be excluded in projection, got ' +
          util.inspect(options._queryProjection));
      }
      modelNames = utils.getValue(normalizedRefPath, doc);
      if (Array.isArray(modelNames)) {
        modelNames = utils.array.flatten(modelNames);
      }
      isRefPath = true;
    } else {
      if (!modelNameFromQuery) {
        let modelForCurrentDoc = model;
        let schemaForCurrentDoc;

        if (!schema && discriminatorKey) {
          modelForFindSchema = utils.getValue(discriminatorKey, doc);

          if (modelForFindSchema) {
            try {
              modelForCurrentDoc = model.db.model(modelForFindSchema);
            } catch (error) {
              return error;
            }

            schemaForCurrentDoc = modelForCurrentDoc.schema._getSchema(options.path);

            if (schemaForCurrentDoc && schemaForCurrentDoc.caster) {
              schemaForCurrentDoc = schemaForCurrentDoc.caster;
            }
          }
        } else {
          schemaForCurrentDoc = schema;
        }
        const virtual = getVirtual(modelForCurrentDoc.schema, options.path);

        let ref;
        if ((ref = get(schemaForCurrentDoc, 'options.ref')) != null) {
          modelNames = [ref];
        } else if ((ref = get(virtual, 'options.ref')) != null) {
          if (typeof ref === 'function') {
            ref = ref.call(doc, doc);
          }

          // When referencing nested arrays, the ref should be an Array
          // of modelNames.
          if (Array.isArray(ref)) {
            modelNames = ref;
          } else {
            modelNames = [ref];
          }

          isVirtual = true;
        } else {
          // We may have a discriminator, in which case we don't want to
          // populate using the base model by default
          modelNames = discriminatorKey ? null : [model.modelName];
        }
      } else {
        modelNames = [modelNameFromQuery]; // query options
      }
    }

    if (!modelNames) {
      return { modelNames: modelNames, isRefPath: isRefPath };
    }

    if (!Array.isArray(modelNames)) {
      modelNames = [modelNames];
    }

    return { modelNames: modelNames, isRefPath: isRefPath };
  }

  return map;
}

/*!
 * Retrieve the _id of `val` if a Document or Array of Documents.
 *
 * @param {Array|Document|Any} val
 * @return {Array|Document|Any}
 */

function convertTo_id(val) {
  if (val instanceof Model) return val._id;

  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; ++i) {
      if (val[i] instanceof Model) {
        val[i] = val[i]._id;
      }
    }
    if (val.isMongooseArray && val._schema) {
      return val._schema.cast(val, val._parent);
    }

    return [].concat(val);
  }

  // `populate('map')` may be an object if populating on a doc that hasn't
  // been hydrated yet
  if (val != null && val.constructor.name === 'Object') {
    const ret = [];
    for (const key of Object.keys(val)) {
      ret.push(val[key]);
    }
    return ret;
  }
  // If doc has already been hydrated, e.g. `doc.populate('map').execPopulate()`
  // then `val` will already be a map
  if (val instanceof Map) {
    return Array.from(val.values());
  }

  return val;
}

/*!
 * 1) Apply backwards compatible find/findOne behavior to sub documents
 *
 *    find logic:
 *      a) filter out non-documents
 *      b) remove _id from sub docs when user specified
 *
 *    findOne
 *      a) if no doc found, set to null
 *      b) remove _id from sub docs when user specified
 *
 * 2) Remove _ids when specified by users query.
 *
 * background:
 * _ids are left in the query even when user excludes them so
 * that population mapping can occur.
 */

function valueFilter(val, assignmentOpts, populateOptions) {
  if (Array.isArray(val)) {
    // find logic
    const ret = [];
    const numValues = val.length;
    for (let i = 0; i < numValues; ++i) {
      const subdoc = val[i];
      if (!isDoc(subdoc) && (!populateOptions.retainNullValues || subdoc != null)) {
        continue;
      }
      maybeRemoveId(subdoc, assignmentOpts);
      ret.push(subdoc);
      if (assignmentOpts.originalLimit &&
          ret.length >= assignmentOpts.originalLimit) {
        break;
      }
    }

    // Since we don't want to have to create a new mongoosearray, make sure to
    // modify the array in place
    while (val.length > ret.length) {
      Array.prototype.pop.apply(val, []);
    }
    for (let i = 0; i < ret.length; ++i) {
      val[i] = ret[i];
    }
    return val;
  }

  // findOne
  if (isDoc(val)) {
    maybeRemoveId(val, assignmentOpts);
    return val;
  }

  if (populateOptions.justOne === true) {
    return (val == null ? val : null);
  }
  if (populateOptions.justOne === false) {
    return [];
  }
  return val;
}

/*!
 * Remove _id from `subdoc` if user specified "lean" query option
 */

function maybeRemoveId(subdoc, assignmentOpts) {
  if (assignmentOpts.excludeId) {
    if (typeof subdoc.setValue === 'function') {
      delete subdoc._doc._id;
    } else {
      delete subdoc._id;
    }
  }
}

/*!
 * Determine if `doc` is a document returned
 * by a populate query.
 */

function isDoc(doc) {
  if (doc == null) {
    return false;
  }

  const type = typeof doc;
  if (type === 'string') {
    return false;
  }

  if (type === 'number') {
    return false;
  }

  if (Buffer.isBuffer(doc)) {
    return false;
  }

  if (doc.constructor.name === 'ObjectID') {
    return false;
  }

  // only docs
  return true;
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
  model.model = Model.prototype.model;
  model.db = model.prototype.db = connection;
  model.discriminators = model.prototype.discriminators = undefined;

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
    capped: schema.options.capped
  };

  model.prototype.collection = connection.collection(
    collectionName,
    collectionOptions
  );

  // apply methods and statics
  applyMethods(model, schema);
  applyStatics(model, schema);
  applyHooks(model, schema);

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

  const kareemOptions = {
    useErrorHandlers: true,
    numCallbackParams: 1
  };
  model.$__insertMany = model.hooks.createWrapper('insertMany',
    model.$__insertMany, model, kareemOptions);

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
  Model.db = Model.prototype.db = conn;

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
  Model.collection = Model.prototype.collection;
  // Errors handled internally, so ignore
  Model.init(() => {});
  return Model;
};

Model.$wrapCallback = function(callback) {
  if (callback == null) {
    return callback;
  }
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function, got ' + callback);
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
 * Module exports.
 */

module.exports = exports = Model;
