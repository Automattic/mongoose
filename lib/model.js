/*!
 * Module dependencies.
 */

var Document = require('./document')
  , MongooseArray = require('./types/array')
  , MongooseBuffer = require('./types/buffer')
  , MongooseError = require('./error')
  , VersionError = require('./errors/version')
  , Query = require('./query')
  , Schema = require('./schema')
  , Types = require('./schema/index')
  , utils = require('./utils')
  , isMongooseObject = utils.isMongooseObject
  , EventEmitter = require('events').EventEmitter
  , merge = utils.merge
  , Promise = require('./promise')
  , assert = require('assert')
  , tick = utils.tick

var VERSION_WHERE = 1
  , VERSION_INC = 2
  , VERSION_ALL = VERSION_WHERE | VERSION_INC;

/**
 * Model constructor
 *
 * @param {Object} doc values to with which to create the document
 * @inherits Document
 * @event `error`: If listening to this Model event, it is emitted when a document was saved without passing a callback and an `error` occurred. If not listening, the event bubbles to the connection used to create this Model.
 * @event `index`: Emitted after `Model#ensureIndexes` completes. If an error occurred it is passed with the event.
 * @api public
 */

function Model (doc, fields, skipId) {
  Document.call(this, doc, fields, skipId);
};

/*!
 * Inherits from Document.
 *
 * All Model.prototype features are available on
 * top level (non-sub) documents.
 */

Model.prototype.__proto__ = Document.prototype;

/**
 * Connection the model uses.
 *
 * @api public
 * @property db
 */

Model.prototype.db;

/**
 * Collection the model uses.
 *
 * @api public
 * @property collection
 */

Model.prototype.collection;

/**
 * The name of the model
 *
 * @api public
 * @property modelName
 */

Model.prototype.modelName;

/*!
 * Handles doc.save() callbacks
 */

function handleSave (promise, self) {
  return tick(function handleSave (err, result) {
    if (err) {
      // If the initial insert fails provide a second chance.
      // (If we did this all the time we would break updates)
      if (self.$__.inserting) {
        self.isNew = true;
        self.emit('isNew', true);
      }
      promise.error(err);
      promise = self = null;
      return;
    }

    self._storeShard();

    var numAffected;
    if (result) {
      // when inserting, the array of created docs is returned
      numAffected = result.length
        ? result.length
        : result;
    } else {
      numAffected = 0;
    }

    // was this an update that required a version bump?
    if (self.$__.version && !self.$__.inserting) {
      var doIncrement = VERSION_INC === (VERSION_INC & self.$__.version);
      self.$__.version = undefined;

      // increment version if was successful
      if (numAffected > 0) {
        if (doIncrement) {
          var key = self.schema.options.versionKey;
          var version = self.getValue(key) | 0;
          self.setValue(key, version + 1);
        }
      } else {
        // the update failed. pass an error back
        promise.error(new VersionError);
        promise = self = null;
        return;
      }
    }

    self.emit('save', self, numAffected);
    promise.complete(self, numAffected);
    promise = self = null;
  });
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
 * The `fn` callback is optional. If no `fn` is passed and validation fails, the validation error will be emitted on the connection used to create this model.
 *
 *     var db = mongoose.createConnection(..);
 *     var schema = new Schema(..);
 *     var Product = db.model('Product', schema);
 *
 *     db.on('error', handleError);
 *
 * However, if you desire more local error handling you can add an `error` listener to the model and handle errors there instead.
 *
 *     Product.on('error', handleError);
 *
 * @param {Function} [fn] optional callback
 * @api public
 * @see middleware http://mongoosejs.com/docs/middleware.html
 */

Model.prototype.save = function save (fn) {
  var promise = new Promise(fn)
    , complete = handleSave(promise, this)
    , options = {}

  if (this.schema.options.safe) {
    options.safe = this.schema.options.safe;
  }

  if (this.isNew) {
    // send entire doc
    var obj = this.toObject({ depopulate: 1 });
    this._version(true, obj);
    this.collection.insert(obj, options, complete);
    this._reset();
    this.isNew = false;
    this.emit('isNew', false);
    // Make it possible to retry the insert
    this.$__.inserting = true;

  } else {
    // Make sure we don't treat it as a new object on error,
    // since it already exists
    this.$__.inserting = false;

    var delta = this._delta();
    if (delta) {
      var where = this._where(delta[0]);
      this._reset();
      this.collection.update(where, delta[1], options, complete);
    } else {
      this._reset();
      complete(null);
    }

    this.emit('isNew', false);
  }
};

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

function operand (self, where, delta, data, val, op) {
  // delta
  op || (op = '$set');
  if (!delta[op]) delta[op] = {};
  delta[op][data.path] = val;

  // disabled versioning?
  if (false === self.schema.options.versionKey) return;

  // already marked for versioning?
  if (VERSION_ALL === (VERSION_ALL & self.$__.version)) return;

  switch (op) {
    case '$set':
    case '$unset':
    case '$pop':
    case '$pull':
    case '$pullAll':
    case '$push':
    case '$pushAll':
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

  if ('$push' == op || '$pushAll' == op || '$addToSet' == op) {
    self.$__.version = VERSION_INC;
  }
  else if (/^\$p/.test(op)) {
    // potentially changing array positions
    self.increment();
  }
  else if (Array.isArray(val)) {
    // $set an array
    self.increment();
  }
  // now handling $set, $unset
  else if (/\.\d+/.test(data.path)) {
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
 * @param {Array} val
 */

function handleAtomics (self, where, delta, data, val) {
  if (delta.$set && delta.$set[data.path]) {
    // $set has precedence over other atomics
    return;
  }

  var atomics = val._atomics
    , ops = Object.keys(atomics)
    , schema = data.schema
    , path = data.path
    , i = ops.length
    , val
    , op;

  if (0 === i) {
    // $set

    if (isMongooseObject(val)) {
      val = val.toObject({ depopulate: 1 });
    } else if (val.valueOf) {
      val = val.valueOf();
    }

    return operand(self, where, delta, data, val);
  }

  while (i--) {
    op = ops[i];
    val = atomics[op];
    if (isMongooseObject(val)) {
      val = val.toObject({ depopulate: 1 })
    } else if (Array.isArray(val)) {
      val = val.map(function (mem) {
        return isMongooseObject(mem)
          ? mem.toObject({ depopulate: 1 })
          : mem;
      })
    } else if (val.valueOf) {
      val = val.valueOf()
    }

    if ('$addToSet' === op)
      val = { $each: val };

    operand(self, where, delta, data, val, op);
  }
}

/**
 * Produces a special query document of the modified properties used in updates.
 *
 * @api private
 */

Model.prototype._delta = function _delta () {
  var dirty = this._dirty();
  if (!dirty.length) return;

  var self = this
    , where = {}
    , delta = {}
    , len = dirty.length
    , d = 0
    , val
    , obj

  for (; d < len; ++d) {
    var data = dirty[d]
    var value = data.value
    var schema = data.schema

    if (undefined === value) {
      operand(self, where, delta, data, 1, '$unset');

    } else if (null === value) {
      operand(self, where, delta, data, null);

    } else if (value._path && value._atomics) {
      // arrays and other custom types (support plugins etc)
      handleAtomics(self, where, delta, data, value);

    } else if (value._path && Buffer.isBuffer(value)) {
      // MongooseBuffer
      value = value.toObject();
      operand(self, where, delta, data, value);

    } else {
      value = utils.clone(value);
      operand(self, where, delta, data, value);
    }
  }

  if (this.$__.version) {
    this._version(where, delta);
  }

  return [where, delta];
}

/**
 * Appends versioning to the where and update clauses.
 *
 * @api private
 */

Model.prototype._version = function _version (where, delta) {
  var key = this.schema.options.versionKey;

  if (true === where) {
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
    where[key] = this.getValue(key);
  }

  if (VERSION_INC === (VERSION_INC & this.$__.version)) {
    delta.$inc || (delta.$inc = {});
    delta.$inc[key] = 1;
  }
}

/**
 * Signal that we desire an increment of this documents version.
 *
 * @see versionKeys http://mongoosejs.com/docs/guide.html#versionKey
 * @api public
 */

Model.prototype.increment = function increment () {
  this.$__.version = VERSION_ALL;
  return this;
}

/**
 * Returns a query object which applies shardkeys if they exist.
 *
 * @api private
 */

Model.prototype._where = function _where (where) {
  where || (where = {});

  var paths
    , len

  if (this.$__.shardval) {
    paths = Object.keys(this.$__.shardval)
    len = paths.length

    for (var i = 0; i < len; ++i) {
      where[paths[i]] = this.$__.shardval[paths[i]];
    }
  }

  where._id = this._doc._id;
  return where;
}

/**
 * Removes this document from the db.
 *
 * ####Example:
 *
 *     product.remove(function (err, product) {
 *       if (err) return handleError(err);
 *       Product.findById(product._id, function (err, product) {
 *         console.log(product) // null
 *       })
 *     })
 *
 * @param {Function} [fn] optional callback
 * @api public
 */

Model.prototype.remove = function remove (fn) {
  if (this.$__.removing) {
    this.$__.removing.addBack(fn);
    return this;
  }

  var promise = this.$__.removing = new Promise(fn)
    , where = this._where()
    , self = this
    , options = {}

  if (this.schema.options.safe) {
    options.safe = this.schema.options.safe;
  }

  this.collection.remove(where, options, tick(function (err) {
    if (err) {
      promise.error(err);
      promise = self = self.$__.removing = where = options = null;
      return;
    }
    self.emit('remove', self);
    promise.complete();
    promise = self = where = options = null;
  }));

  return this;
};

/**
 * Register hooks override
 *
 * @api private
 */

Model.prototype._registerHooks = function registerHooks () {
  Document.prototype._registerHooks.call(this);
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

Model.prototype.model = function model (name) {
  return this.db.model(name);
};

// Model (class) features

/*!
 * Give the constructor the ability to emit events.
 */

for (var i in EventEmitter.prototype)
  Model[i] = EventEmitter.prototype[i];

/**
 * Called when the model compiles.
 *
 * @api private
 */

Model.init = function init () {
  if (this.schema.options.autoIndex) {
    this.ensureIndexes();
  }

  this.schema.emit('init', this);
};

/**
 * Sends `ensureIndex` commands to mongo for each index declared in the schema.
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
 * @param {Function} [cb] optional callback
 * @api public
 */

Model.ensureIndexes = function ensureIndexes (cb) {
  var indexes = this.schema.indexes();
  if (!indexes.length) {
    return cb && cb();
  }

  var self = this
    , safe = self.schema.options.safe
    , count = indexes.length
    , error

  indexes.forEach(function (index) {
    var options = index[1];
    options.safe = safe;
    self.collection.ensureIndex(index[0], options, tick(function (err) {
      if (err) error = err;
      if (--count) return;

      self.emit('index', error);
      cb && cb(error);
    }));
  });
}

/**
 * Schema the model uses.
 *
 * @property schema
 * @receiver Model
 * @api public
 */

Model.schema;

/*!
 * Connection instance the model uses.
 *
 * @property db
 * @receiver Model
 * @api public
 */

Model.db;

/*!
 * Collection the model uses.
 *
 * @property collection
 * @receiver Model
 * @api public
 */

Model.collection;

/**
 * Base Mongoose instance the model uses.
 *
 * @property base
 * @receiver Model
 * @api public
 */

Model.base;

/**
 * Removes documents from the collection.
 *
 * ####Example:
 *
 *     Comment.remove({ title: 'baby born from alien father' }, function (err) {
 *
 *     });
 *
 * ####Note:
 *
 * To remove documents without waiting for a response from MongoDB, do not pass a `callback`, then call `exec` on the returned [Query](#query-js):
 *
 *     var query = Comment.remove({ _id: id });
 *     query.exec();
 *
 * ####Note:
 *
 * This method sends a remove command directly to MongoDB, no Mongoose documents are involved. Because no Mongoose documents are involved, _no middleware (hooks) are executed_.
 *
 * @param {Object} conditions
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.remove = function remove (conditions, callback) {
  if ('function' === typeof conditions) {
    callback = conditions;
    conditions = {};
  }

  var query = new Query(conditions).bind(this, 'remove');

  if ('undefined' === typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.remove(callback);
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
 * @param {Object} [fields] optional fields to select
 * @param {Object} [options] optional
 * @param {Function} [callback]
 * @return {Query}
 * @see field selection #query_Query-select
 * @see promise #promise-js
 * @api public
 */

Model.find = function find (conditions, fields, options, callback) {
  if ('function' == typeof conditions) {
    callback = conditions;
    conditions = {};
    fields = null;
    options = null;
  } else if ('function' == typeof fields) {
    callback = fields;
    fields = null;
    options = null;
  } else if ('function' == typeof options) {
    callback = options;
    options = null;
  }

  var query = new Query(conditions, options);
  query.bind(this, 'find');
  query.select(fields);

  if ('undefined' === typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.find(callback);
};

/**
 * Merges the current named scope query into `query`.
 *
 * @param {Query} query
 * @return {Query}
 * @api private
 */

Model._applyNamedScope = function _applyNamedScope (query) {
  var cQuery = this._cumulativeQuery;

  if (cQuery) {
    merge(query._conditions, cQuery._conditions);
    if (query._fields && cQuery._fields)
      merge(query._fields, cQuery._fields);
    if (query.options && cQuery.options)
      merge(query.options, cQuery.options);
    delete this._cumulativeQuery;
  }

  return query;
}

/**
 * Finds a single document by id.
 *
 * The `id` is cast based on the Schema before sending the command.
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
 * @param {ObjectId|HexId} id objectid, or a value that can be casted to one
 * @param {Object} [fields] optional fields to select
 * @param {Object} [options] optional
 * @param {Function} [callback]
 * @return {Query}
 * @see field selection #query_Query-select
 * @see lean queries #query_Query-lean
 * @api public
 */

Model.findById = function findById (id, fields, options, callback) {
  return this.findOne({ _id: id }, fields, options, callback);
};

/**
 * Finds one document.
 *
 * The `conditions` are cast to their respective SchemaTypes before the command is sent.
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
 * @param {Object} conditions
 * @param {Object} [fields] optional fields to select
 * @param {Object} [options] optional
 * @param {Function} [callback]
 * @return {Query}
 * @see field selection #query_Query-select
 * @see lean queries #query_Query-lean
 * @api public
 */

Model.findOne = function findOne (conditions, fields, options, callback) {
  if ('function' == typeof options) {
    callback = options;
    options = null;
  } else if ('function' == typeof fields) {
    callback = fields;
    fields = null;
    options = null;
  } else if ('function' == typeof conditions) {
    callback = conditions;
    conditions = {};
    fields = null;
    options = null;
  }

  var query = new Query(conditions, options).select(fields).bind(this, 'findOne');

  if ('undefined' == typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.findOne(callback);
};

/**
 * Counts number of matching documents in a database collection.
 *
 * ####Example:
 *
 *     Adventure.count({ type: 'jungle' }, function (err, count) {
 *       if (err) ..
 *       console.log('there are %d jungle adventures', count);
 *     });
 *
 * @param {Object} conditions
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.count = function count (conditions, callback) {
  if ('function' === typeof conditions)
    callback = conditions, conditions = {};

  var query = new Query(conditions).bind(this, 'count');
  if ('undefined' == typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.count(callback);
};

/**
 * Executes a DISTINCT command
 *
 * @param {String} field
 * @param {Object} [conditions] optional
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.distinct = function distinct (field, conditions, callback) {
  var query = new Query(conditions).bind(this, 'distinct');
  if ('undefined' == typeof callback) {
    query._distinctArg = field;
    return query;
  }

  this._applyNamedScope(query);
  return query.distinct(field, callback);
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

Model.where = function where (path, val) {
  var q = new Query().bind(this, 'find');
  return q.where.apply(q, arguments);
};

/**
 * Creates a `Query` and specifies a `$where` condition.
 *
 * Sometimes you need to query for things in mongodb using a JavaScript expression. You can do so via `find({ $where: javascript })`, or you can use the mongoose shortcut method $where via a Query chain or from your mongoose Model.
 *
 *     Blog.$where('this.comments.length > 5').exec(function (err, docs) {});
 *
 * @param {String|Function} argument is a javascript string or anonymous function
 * @method $where
 * @memberOf Model
 * @return {Query}
 * @see Query.$where #query_Query-%24where
 * @api public
 */

Model.$where = function $where () {
  var q = new Query().bind(this, 'find');
  return q.$where.apply(q, arguments);
};

/**
 * Issues a mongodb findAndModify update command.
 *
 * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback. The query executes immediately if `callback` is passed else a Query object is returned.
 *
 * ####Options:
 *
 * - `new`: bool - true to return the modified document rather than the original. defaults to true
 * - `upsert`: bool - creates the object if it doesn't exist. defaults to false.
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `select`: sets the document fields to return
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
 *     Model.findOneAndUpdate(query, { name: 'jason borne' }, options, callback)
 *
 *     // is sent as
 *     Model.findOneAndUpdate(query, { $set: { name: 'jason borne' }}, options, callback)
 *
 * This helps prevent accidentally overwriting your document with `{ name: 'jason borne' }`.
 *
 * ####Note:
 *
 * Although values are cast to their appropriate types when using the findAndModify helpers, the following are *not* applied:
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
 *       doc.name = 'jason borne';
 *       doc.save(callback);
 *     })
 *
 * @param {Object} [conditions]
 * @param {Object} [update]
 * @param {Object} [options]
 * @param {Function} [callback]
 * @return {Query}
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @api public
 */

Model.findOneAndUpdate = function (conditions, update, options, callback) {
  if ('function' == typeof options) {
    callback = options;
    options = null;
  }
  else if (1 === arguments.length) {
    if ('function' == typeof conditions) {
      var msg = 'Model.findOneAndUpdate(): First argument must not be a function.\n\n'
              + '  ' + this.modelName + '.findOneAndUpdate(conditions, update, options, callback)\n'
              + '  ' + this.modelName + '.findOneAndUpdate(conditions, update, options)\n'
              + '  ' + this.modelName + '.findOneAndUpdate(conditions, update)\n'
              + '  ' + this.modelName + '.findOneAndUpdate(update)\n'
              + '  ' + this.modelName + '.findOneAndUpdate()\n';
      throw new TypeError(msg)
    }
    update = conditions;
    conditions = undefined;
  }

  var fields;
  if (options && options.fields) {
    fields = options.fields;
    options.fields = undefined;
  }

  var query = new Query(conditions);
  query.setOptions(options);
  query.select(fields);
  query.bind(this, 'findOneAndUpdate', update);

  if ('undefined' == typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.findOneAndUpdate(callback);
}

/**
 * Issues a mongodb findAndModify update command by a documents id.
 *
 * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback. The query executes immediately if `callback` is passed else a Query object is returned.
 *
 * ####Options:
 *
 * - `new`: bool - true to return the modified document rather than the original. defaults to true
 * - `upsert`: bool - creates the object if it doesn't exist. defaults to false.
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `select`: sets the document fields to return
 *
 * ####Examples:
 *
 *     A.findByIdAndUpdate(id, update, options, callback) // executes
 *     A.findByIdAndUpdate(id, update, options)  // returns Query
 *     A.findByIdAndUpdate(id, update, callback) // executes
 *     A.findByIdAndUpdate(id, update)           // returns Query
 *     A.findByIdAndUpdate()                     // returns Query
 *
 * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback. The query executes      immediately if `callback` is passed else a Query object is returned.
 *
 * ####Options:
 *
 * - `new`: bool - true to return the modified document rather than the original. defaults to true
 * - `upsert`: bool - creates the object if it doesn't exist. defaults to false.
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 *
 * ####Note:
 *
 * All top level update keys which are not `atomic` operation names are treated as set operations:
 *
 * ####Example:
 *
 *     Model.findByIdAndUpdate(id, { name: 'jason borne' }, options, callback)
 *
 *     // is sent as
 *     Model.findByIdAndUpdate(id, { $set: { name: 'jason borne' }}, options, callback)
 *
 * This helps prevent accidentally overwriting your document with `{ name: 'jason borne' }`.
 *
 * ####Note:
 *
 * Although values are cast to their appropriate types when using the findAndModify helpers, the following are *not* applied:
 *
 * - defaults
 * - setters
 * - validators
 * - middleware
 *
 * If you need those features, use the traditional approach of first retrieving the document.
 *
 *     Model.findById(id, function (err, doc) {
 *       if (err) ..
 *       doc.name = 'jason borne';
 *       doc.save(callback);
 *     })
 *
 * @param {ObjectId|HexId} id an ObjectId or string that can be cast to one.
 * @param {Object} [update]
 * @param {Object} [options]
 * @param {Function} [callback]
 * @return {Query}
 * @see Model.findOneAndUpdate #model_Model.findOneAndUpdate
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @api public
 */

Model.findByIdAndUpdate = function (id, update, options, callback) {
  var args;

  if (1 === arguments.length) {
    if ('function' == typeof id) {
      var msg = 'Model.findByIdAndUpdate(): First argument must not be a function.\n\n'
                + '  ' + this.modelName + '.findByIdAndUpdate(id, callback)\n'
                + '  ' + this.modelName + '.findByIdAndUpdate(id)\n'
                + '  ' + this.modelName + '.findByIdAndUpdate()\n';
      throw new TypeError(msg)
    }
    return this.findOneAndUpdate({_id: id }, undefined);
  }

  args = utils.args(arguments, 1);
  args.unshift({ _id: id });
  return this.findOneAndUpdate.apply(this, args);
}

/**
 * Issue a mongodb findAndModify remove command.
 *
 * Finds a matching document, removes it, passing the found document (if any) to the callback.
 *
 * Executes immediately if `callback` is passed else a Query object is returned.
 *
 * ####Options:
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `select`: sets the document fields to return
 *
 * ####Examples:
 *
 *     A.findOneAndRemove(conditions, options, callback) // executes
 *     A.findOneAndRemove(conditions, options)  // return Query
 *     A.findOneAndRemove(conditions, callback) // executes
 *     A.findOneAndRemove(conditions) // returns Query
 *     A.findOneAndRemove()           // returns Query
 *
 * @param {Object} conditions
 * @param {Object} [options]
 * @param {Function} [callback]
 * @return {Query}
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @api public
 */

Model.findOneAndRemove = function (conditions, options, callback) {
  if (1 === arguments.length && 'function' == typeof conditions) {
    var msg = 'Model.findOneAndRemove(): First argument must not be a function.\n\n'
              + '  ' + this.modelName + '.findOneAndRemove(conditions, callback)\n'
              + '  ' + this.modelName + '.findOneAndRemove(conditions)\n'
              + '  ' + this.modelName + '.findOneAndRemove()\n';
    throw new TypeError(msg)
  }

  if ('function' == typeof options) {
    callback = options;
    options = undefined;
  }

  var fields;
  if (options) {
    fields = options.select;
    options.select = undefined;
  }

  var query = new Query(conditions);
  query.setOptions(options);
  query.select(fields);
  query.bind(this, 'findOneAndRemove');

  if ('undefined' == typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.findOneAndRemove(callback);
}

/**
 * Issue a mongodb findAndModify remove command by a documents id.
 *
 * Finds a matching document, removes it, passing the found document (if any) to the callback.
 *
 * Executes immediately if `callback` is passed, else a `Query` object is returned.
 *
 * ####Options:
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `select`: sets the document fields to return
 *
 * ####Examples:
 *
 *     A.findByIdAndRemove(id, options, callback) // executes
 *     A.findByIdAndRemove(id, options)  // return Query
 *     A.findByIdAndRemove(id, callback) // executes
 *     A.findByIdAndRemove(id) // returns Query
 *     A.findByIdAndRemove()           // returns Query
 *
 * @param {ObjectId|HexString} id ObjectId or string that can be cast to one
 * @param {Object} [options]
 * @param {Function} [callback]
 * @return {Query}
 * @see Model.findOneAndRemove #model_Model.findOneAndRemove
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 */

Model.findByIdAndRemove = function (id, options, callback) {
  if (1 === arguments.length && 'function' == typeof id) {
    var msg = 'Model.findByIdAndRemove(): First argument must not be a function.\n\n'
              + '  ' + this.modelName + '.findByIdAndRemove(id, callback)\n'
              + '  ' + this.modelName + '.findByIdAndRemove(id)\n'
              + '  ' + this.modelName + '.findByIdAndRemove()\n';
    throw new TypeError(msg)
  }

  return this.findOneAndRemove({ _id: id }, options, callback);
}

/**
 * Shortcut for creating a new Document that is automatically saved to the db if valid.
 *
 * ####Example:
 *
 *     Candy.create({ type: 'jelly bean' }, { type: 'snickers' }, function (err, jellybean, snickers) {
 *       if (err) // ...
 *     });
 *
 *     var array = [{ type: 'jelly bean' }, { type: 'snickers' }];
 *     Candy.create(array, function (err, jellybean, snickers) {
 *       if (err) // ...
 *     });
 *
 * @param {Array|Object...} doc
 * @param {Function} fn callback
 * @api public
 */

Model.create = function create (doc, fn) {
  if (1 === arguments.length) {
    return 'function' === typeof doc && doc(null);
  }

  var self = this
    , docs = [null]
    , promise
    , count
    , args

  if (Array.isArray(doc)) {
    args = doc;
  } else {
    args = utils.args(arguments, 0, arguments.length - 1);
    fn = arguments[arguments.length - 1];
  }

  if (0 === args.length) return fn(null);

  promise = new Promise(fn);
  count = args.length;

  args.forEach(function (arg, i) {
    var doc = new self(arg);
    docs[i+1] = doc;
    doc.save(function (err) {
      if (err) return promise.error(err);
      --count || fn.apply(null, docs);
    });
  });

  // TODO
  // utilize collection.insertAll for batch processing?
};

/**
 * Updates documents in the database without returning them.
 *
 * ####Examples:
 *
 *     MyModel.update({ age: { $gt: 18 } }, { oldEnough: true }, fn);
 *     MyModel.update({ name: 'Tobi' }, { ferret: true }, { multi: true }, function (err, numberAffected, raw) {
 *       if (err) return handleError(err);
 *       console.log('The number of updated documents was %d', numberAffected);
 *       console.log('The raw response from Mongo was ', raw);
 *     });
 *
 * ####Valid options:
 *
 *  - `safe` (boolean) safe mode (defaults to value set in schema (true))
 *  - `upsert` (boolean) whether to create the doc if it doesn't match (false)
 *  - `multi` (boolean) whether multiple documents should be updated (false)
 *
 * All `update` values are cast to their appropriate SchemaTypes before being sent.
 *
 * The `callback` function receives `(err, numberAffected, rawResponse)`.
 *
 * - `err` is the error if any occurred
 * - `numberAffected` is the count of updated documents Mongo reported
 * - `rawResponse` is the full response from Mongo
 *
 * ####Note:
 *
 * All top level keys which are not `atomic` operation names are treated as set operations:
 *
 * ####Example:
 *
 *     var query = { name: 'borne' };
 *     Model.update(query, { name: 'jason borne' }, options, callback)
 *
 *     // is sent as
 *     Model.update(query, { $set: { name: 'jason borne' }}, options, callback)
 *
 * This helps prevent accidentally overwriting all documents in your collection with `{ name: 'jason borne' }`.
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
 *       doc.name = 'jason borne';
 *       doc.save(callback);
 *     })
 *
 * @param {Object} conditions
 * @param {Object} update
 * @param {Object} [options]
 * @param {Function} [callback]
 * @return {Query}
 * @api public
 */

Model.update = function update (conditions, doc, options, callback) {
  if (arguments.length < 4) {
    if ('function' === typeof options) {
      // Scenario: update(conditions, doc, callback)
      callback = options;
      options = null;
    } else if ('function' === typeof doc) {
      // Scenario: update(doc, callback);
      callback = doc;
      doc = conditions;
      conditions = {};
      options = null;
    }
  }

  var query = new Query(conditions, options).bind(this, 'update', doc);

  if ('undefined' == typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.update(doc, callback);
};

/**
 * Executes a mapReduce command.
 *
 * `o` is an object specifying all mapReduce options as well as the map and reduce functions. All options are delegated to the driver implementation.
 *
 * ####Example:
 *
 *     var o = {};
 *     o.map = function () { emit(this.name, 1) }
 *     o.reduce = function (k, vals) { return vals.length }
 *     User.mapReduce(o, function (err, results) {
 *       console.log(results)
 *     })
 *
 * ####Other options:
 *
 * - `query` {Object} query filter object.
 * - `limit` {Number} max number of documents
 * - `keeptemp` {Boolean, default:false} keep temporary data
 * - `finalize` {Function} finalize function
 * - `scope` {Object} scope variables exposed to map/reduce/finalize during execution
 * - `jsMode` {Boolean, default:false} it is possible to make the execution stay in JS. Provided in MongoDB > 2.0.X
 * - `verbose` {Boolean, default:false} provide statistics on job execution time.
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
 *     o.map = function () { emit(this.name, 1) }
 *     o.reduce = function (k, vals) { return vals.length }
 *     o.out = { replace: 'createdCollectionNameForResults' }
 *     o.verbose = true;
 *     User.mapReduce(o, function (err, model, stats) {
 *       console.log('map reduce took %d ms', stats.processtime)
 *       model.find().where('value').gt(10).exec(function (err, docs) {
 *         console.log(docs);
 *       });
 *     })
 *
 * @param {Object} o an object specifying map-reduce options
 * @param {Function} callback
 * @see http://www.mongodb.org/display/DOCS/MapReduce
 * @api public
 */

Model.mapReduce = function mapReduce (o, callback) {
  if ('function' != typeof callback) throw new Error('missing callback');

  var self = this;

  if (!Model.mapReduce.schema) {
    var opts = { noId: true, noVirtualId: true, strict: false }
    Model.mapReduce.schema = new Schema({}, opts);
  }

  if (!o.out) o.out = { inline: 1 };

  o.map = String(o.map);
  o.reduce = String(o.reduce);

  if (o.query) {
    var q = new Query(o.query);
    q.cast(this);
    o.query = q._conditions;
    q = undefined;
  }

  this.collection.mapReduce(null, null, o, function (err, ret, stats) {
    if (err) return callback(err);

    if (ret.findOne && ret.mapReduce) {
      // returned a collection, convert to Model
      var model = Model.compile(
          '_mapreduce_' + ret.collectionName
        , Model.mapReduce.schema
        , ret.collectionName
        , self.db
        , self.base);

      model._mapreduce = true;

      return callback(err, model, stats);
    }

    callback(err, ret, stats);
  });
}

/**
 * Executes an aggregate command on this models collection.
 *
 * ####Example:
 *
 *     // find the max age of all users
 *     Users.aggregate(
 *         { $group: { _id: null, maxAge: { $max: '$age' }}}
 *       , { $project: { _id: 0, maxAge: 1 }}
 *       , function (err, res) {
 *       if (err) return handleError(err);
 *       console.log(res); // [ { maxAge: 98 } ]
 *     });
 *
 * _NOTE: the documents returned are plain javascript objects, not mongoose documents cast to this models schema definition (since any shape of document can be returned)._
 *
 * _NOTE: this requires running MongoDB >= 2.1_
 *
 * @param {Array} array an array of pipeline commands
 * @param {Object} [options]
 * @param {Function} callback
 * @see aggregation http://docs.mongodb.org/manual/applications/aggregation/
 * @see driver http://mongodb.github.com/node-mongodb-native/api-generated/collection.html#aggregate
 * @api public
 */

Model.aggregate = function aggregate () {
  return this.collection.aggregate.apply(this.collection, arguments);
}

/**
 * Populates document references.
 *
 * ####Example:
 *
 *     User.findById(id, function (err, user) {
 *       var opts = [
 *           { path: 'company', match: { x: 1 }, select: 'name' }
 *         , { path: 'notes', options: {}, model: 'override' }
 *       ]
 *
 *       User.populate(user, opts, function (user) {
 *
 *       })
 *     })
 *
 *     User.find(stuff, function (err, users) {
 *       var opts = [{ path: 'company', match: { x: 1 }, select: 'name' }]
 *
 *       User.populate(users, opts, function (user) {
 *
 *       })
 *     })
 *
 * @param {Document|Array} docs Either a single document or array of documents to populate.
 * @param {Object} options A hash of key/val (path, options) used for population.
 * @param {Function} cb(err, doc) A callback, executed upon completion. Recieves `err` and the `doc(s)`.
 * @api public
 */

Model.populate = function (docs, paths, cb) {
  assert.equal('function', typeof cb);

  // always callback on nextTick for consistent async behavior
  function callback () {
    var args = utils.args(arguments);
    process.nextTick(function () {
      cb.apply(null, args);
    });
  }

  // normalized paths
  var paths = utils.populate(paths);
  var pending = paths.length;

  if (0 === pending) {
    return callback(null, docs);
  }

  // each path has its own query options and must be executed separately
  var i = pending;
  var path;
  while (i--) {
    path = paths[i];
    populate(this, docs, path, next);
  }

  function next (err) {
    if (next.err) return;
    if (err) return callback(next.err = err);
    if (--pending) return;
    callback(null, docs);
  }
}

/*!
 * doc path1 -> modelA
 * doc path2 -> modelB
 * doc instanceof modelC
 *
 * modelC.populate(doc, { path1: args, path2: args }, cb);
 */

function populate (model, docs, options, cb) {
  var select = options.select
    , match = options.match
    , path = options.path
    , sort = options.options && options.options.sort || undefined

  var schema = model._getSchema(path);
  var subpath;

  if (!schema) {
    return cb();
  }

  // handle document arrays
  if (schema && schema.caster) {
    schema = schema.caster;
  }

  var modelName = options.model || schema.options.ref;
  var model = model.db.model(modelName);

  // TODO
  // suffix support #991
  // handle calling Model.populate directly (hydrate vs query, non hydrate?)
  // #570

  // normalize single / multiple docs passed
  if (!Array.isArray(docs)) {
    docs = [docs];
  }

  if (0 === docs.length || docs.every(utils.isNullOrUndefined)) {
    return cb();
  }

  // get all ids for all docs for a given path
  var rawIds = docs.map(function (doc) {
    if (!doc) return doc;

    var isDocument = !! doc.$__;
    var ret;

    if (isDocument) {
      ret = doc.populated(path);
    }

    if (!ret) {
      ret = utils.getValue(path, doc, function (val) {
        if (val && val._id) return val._id;
        return val;
      });
    }

    if (isDocument) {
      // cache original populated _ids
      doc.populated(path, ret);
    }

    return ret;
  });

  /**
   * mpath.path
   * returns a single value if requesting a specific path. the single value may be an array.
   * returns an array when asking for an array or path of all items in array
   * may return an array of arrays if diving deep into arrays
   *
   * rawIds may look something like:
   * ['single', null, array, undefined] // one element for each doc
   * [ [], [], [single, null, array, undefined] ]
   * [ [[]], [[]], [[single, null, array, undefined]] ]
   *
   *
   * old behavior
   *
   * if the value of the path is not an array, use findOne, else find.
   * for findOne the results were assigned directly to doc path.
   * for find, if user specified sort order, results were assigned directly
   * else documents were put back in original order of array if found in results
   *
   */

  // we perform one query per path for all docs.
  // no need to include undefined values in our query so filter em out.
  var ids = utils.array.flatten(rawIds, function (item) {
    return undefined !== item;
  });

  if (0 === ids.length || ids.every(utils.isNullOrUndefined)) {
    return cb();
  }

  match || (match = {});
  match._id || (match._id = { $in: ids });

  model.find(match, select, options.options, function (err, vals) {
    if (err) return cb(err);

    assign(rawIds, vals, sort);

    docs.forEach(function (doc, i) {
      utils.setValue(path, rawIds[i], doc, function (val) {
        if (Array.isArray(val)) {
          return val.filter(isDoc)
        }
        // findOne logic: if no doc found, set to null
        return isDoc(val) ? val : null;
      });
    });

    cb();
  });
}

function isDoc (doc) {
  if (null == doc)
    return false;

  var type = typeof doc;
  if ('string' == type)
    return false;

  if ('number' == type)
    return false;

  if (Buffer.isBuffer(doc))
    return false;

  if ('ObjectID' == doc.constructor.name)
    return false;

  // only docs
  return true;
}

/*!
 * Assign `vals` returned by mongo query to the `rawIds`
 * structure returned from utils.getVals() honoring
 * query sort order if specified by user.
 *
 * This can be optimized.
 *
 * @param {Array} rawIds
 * @param {Array} vals
 * @param {Boolean} sort
 * @api private
 */

function assign (rawIds, vals, sort, recursed) {
  // honor user specified sort order
  var newOrder = [];
  var sorting = sort && rawIds.length > 1;
  var found;
  var doc;
  var sid;
  var id;

  for (var i = 0; i < rawIds.length; ++i) {
    id = rawIds[i];

    if (Array.isArray(id)) {
      // handle [ [id0, id2], [id3] ]
      assign(id, vals, sort, true);
      newOrder.push(id);
      continue;
    }

    // TODO comment why
    if (null === id && !sorting) {
      newOrder.push(id);
      continue;
    }

    sid = String(id);
    found = false;

    if (recursed) {
      // apply find behavior

      // assign matching documents in original order unless sorting
      for (var f = 0; f < vals.length; ++f) {
        if (sid == String(vals[f]._id)) {
          found = true;
          if (sorting) {
            newOrder[f] = vals[f];
          } else {
            newOrder.push(vals[f]);
          }
          break;
        }
      }

      if (!found) {
        newOrder.push(id);
      }

    } else {
      // apply findOne behavior - if document in results, assign, else assign null

      doc = null;
      for (var f = 0; f < vals.length; ++f) {
        if (sid == String(vals[f]._id)) {
          doc = vals[f];
          break;
        }
      }

      newOrder[i] = doc;
    }
  }

  rawIds.length = 0;
  if (newOrder.length) {
    // reassign the documents based on corrected order

    // forEach skips over sparse entries in arrays so we
    // can safely use this to our advantage dealing with sorted
    // result sets too.
    newOrder.forEach(function (doc, i) {
      rawIds[i] = doc;
    });
  }

}

/**
 * Finds the schema for `path`. This is different than
 * calling `schema.path` as it also resolves paths with
 * positional selectors (something.$.another.$.path).
 *
 * @param {String} path
 * @return {Schema}
 * @api private
 */

Model._getSchema = function _getSchema (path) {
  var schema = this.schema
    , pathschema = schema.path(path);

  if (pathschema)
    return pathschema;

  // look for arrays
  return (function search (parts, schema) {
    var p = parts.length + 1
      , foundschema
      , trypath

    while (p--) {
      trypath = parts.slice(0, p).join('.');
      foundschema = schema.path(trypath);
      if (foundschema) {
        if (foundschema.caster) {

          // array of Mixed?
          if (foundschema.caster instanceof Types.Mixed) {
            return foundschema.caster;
          }

          // Now that we found the array, we need to check if there
          // are remaining document paths to look up for casting.
          // Also we need to handle array.$.path since schema.path
          // doesn't work for that.
          if (p !== parts.length) {
            if ('$' === parts[p]) {
              // comments.$.comments.$.title
              return search(parts.slice(p+1), foundschema.schema);
            } else {
              // this is the last path of the selector
              return search(parts.slice(p), foundschema.schema);
            }
          }
        }
        return foundschema;
      }
    }
  })(path.split('.'), schema)
}

/*!
 * Compiler utility.
 *
 * @param {String} name model name
 * @param {Schema} schema
 * @param {String} collectionName
 * @param {Connection} connection
 * @param {Mongoose} base mongoose instance
 */

Model.compile = function compile (name, schema, collectionName, connection, base) {
  // generate new class
  function model (doc, fields, skipId) {
    if (!(this instanceof model))
      return new model(doc, fields, skipId);
    Model.call(this, doc, fields, skipId);
  };

  model.modelName = name;
  model.__proto__ = Model;
  model.prototype.__proto__ = Model.prototype;
  model.prototype.db = connection;
  model.prototype._setSchema(schema);
  model.prototype.collection = connection.collection(
      collectionName
    , schema.options.capped
  );

  // apply methods
  for (var i in schema.methods)
    model.prototype[i] = schema.methods[i];

  // apply statics
  for (var i in schema.statics)
    model[i] = schema.statics[i];

  // apply named scopes
  if (schema.namedScopes) schema.namedScopes.compile(model);

  model.model = model.prototype.model;
  model.options = model.prototype.options;
  model.db = model.prototype.db;
  model.schema = model.prototype.schema;
  model.collection = model.prototype.collection;
  model.base = base;

  return model;
};

/*!
 * Subclass this model with `conn`, `schema`, and `collection` settings.
 *
 * @param {Connection} conn
 * @param {Schema} [schema]
 * @param {String} [collection]
 * @return {Model}
 */

Model.__subclass = function subclass (conn, schema, collection) {
  // subclass model using this connection and collection name
  var model = this;

  var Model = function Model (doc, fields, skipId) {
    if (!(this instanceof Model)) {
      return new Model(doc, fields, skipId);
    }
    model.call(this, doc, fields, skipId);
  }

  Model.__proto__ = model;
  Model.prototype.__proto__ = model.prototype;
  Model.db = Model.prototype.db = conn;

  var s = 'string' != typeof schema
    ? schema
    : model.prototype.schema;

  if (!collection) {
    collection = model.prototype.schema.get('collection')
              || utils.toCollectionName(model.modelName);
  }

  Model.prototype.collection = conn.collection(collection, s && s.options.capped);
  Model.collection = Model.prototype.collection;
  Model.init();
  return Model;
}

/*!
 * Module exports.
 */

module.exports = exports = Model;
