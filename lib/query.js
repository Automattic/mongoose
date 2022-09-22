'use strict';

/*!
 * Module dependencies.
 */

const CastError = require('./error/cast');
const DocumentNotFoundError = require('./error/notFound');
const Kareem = require('kareem');
const MongooseError = require('./error/mongooseError');
const ObjectParameterError = require('./error/objectParameter');
const QueryCursor = require('./cursor/QueryCursor');
const ReadPreference = require('./driver').get().ReadPreference;
const ValidationError = require('./error/validation');
const { applyGlobalMaxTimeMS, applyGlobalDiskUse } = require('./helpers/query/applyGlobalOption');
const applyWriteConcern = require('./helpers/schema/applyWriteConcern');
const cast = require('./cast');
const castArrayFilters = require('./helpers/update/castArrayFilters');
const castNumber = require('./cast/number');
const castUpdate = require('./helpers/query/castUpdate');
const completeMany = require('./helpers/query/completeMany');
const promiseOrCallback = require('./helpers/promiseOrCallback');
const getDiscriminatorByValue = require('./helpers/discriminator/getDiscriminatorByValue');
const hasDollarKeys = require('./helpers/query/hasDollarKeys');
const helpers = require('./queryhelpers');
const immediate = require('./helpers/immediate');
const isExclusive = require('./helpers/projection/isExclusive');
const isInclusive = require('./helpers/projection/isInclusive');
const isSubpath = require('./helpers/projection/isSubpath');
const mpath = require('mpath');
const mquery = require('mquery');
const parseProjection = require('./helpers/projection/parseProjection');
const removeUnusedArrayFilters = require('./helpers/update/removeUnusedArrayFilters');
const sanitizeFilter = require('./helpers/query/sanitizeFilter');
const sanitizeProjection = require('./helpers/query/sanitizeProjection');
const selectPopulatedFields = require('./helpers/query/selectPopulatedFields');
const setDefaultsOnInsert = require('./helpers/setDefaultsOnInsert');
const updateValidators = require('./helpers/updateValidators');
const util = require('util');
const utils = require('./utils');
const validOps = require('./helpers/query/validOps');
const wrapThunk = require('./helpers/query/wrapThunk');

const queryOptionMethods = new Set([
  'allowDiskUse',
  'batchSize',
  'collation',
  'comment',
  'explain',
  'hint',
  'j',
  'lean',
  'limit',
  'maxScan',
  'maxTimeMS',
  'maxscan',
  'populate',
  'projection',
  'read',
  'select',
  'skip',
  'slice',
  'sort',
  'tailable',
  'w',
  'writeConcern',
  'wtimeout'
]);

/**
 * Query constructor used for building queries. You do not need
 * to instantiate a `Query` directly. Instead use Model functions like
 * [`Model.find()`](/docs/api.html#find_find).
 *
 * #### Example:
 *
 *     const query = MyModel.find(); // `query` is an instance of `Query`
 *     query.setOptions({ lean : true });
 *     query.collection(MyModel.collection);
 *     query.where('age').gte(21).exec(callback);
 *
 *     // You can instantiate a query directly. There is no need to do
 *     // this unless you're an advanced user with a very good reason to.
 *     const query = new mongoose.Query();
 *
 * @param {Object} [options]
 * @param {Object} [model]
 * @param {Object} [conditions]
 * @param {Object} [collection] Mongoose collection
 * @api public
 */

function Query(conditions, options, model, collection) {
  // this stuff is for dealing with custom queries created by #toConstructor
  if (!this._mongooseOptions) {
    this._mongooseOptions = {};
  }
  options = options || {};

  this._transforms = [];
  this._hooks = new Kareem();
  this._executionStack = null;

  // this is the case where we have a CustomQuery, we need to check if we got
  // options passed in, and if we did, merge them in
  const keys = Object.keys(options);
  for (const key of keys) {
    this._mongooseOptions[key] = options[key];
  }

  if (collection) {
    this.mongooseCollection = collection;
  }

  if (model) {
    this.model = model;
    this.schema = model.schema;
  }


  // this is needed because map reduce returns a model that can be queried, but
  // all of the queries on said model should be lean
  if (this.model && this.model._mapreduce) {
    this.lean();
  }

  // inherit mquery
  mquery.call(this, null, options);
  if (collection) {
    this.collection(collection);
  }

  if (conditions) {
    this.find(conditions);
  }

  this.options = this.options || {};

  // For gh-6880. mquery still needs to support `fields` by default for old
  // versions of MongoDB
  this.$useProjection = true;

  const collation = this &&
    this.schema &&
    this.schema.options &&
    this.schema.options.collation || null;
  if (collation != null) {
    this.options.collation = collation;
  }
}

/*!
 * inherit mquery
 */

Query.prototype = new mquery();
Query.prototype.constructor = Query;
Query.base = mquery.prototype;

/**
 * Flag to opt out of using `$geoWithin`.
 *
 * ```javascript
 * mongoose.Query.use$geoWithin = false;
 * ```
 *
 * MongoDB 2.4 deprecated the use of `$within`, replacing it with `$geoWithin`. Mongoose uses `$geoWithin` by default (which is 100% backward compatible with `$within`). If you are running an older version of MongoDB, set this flag to `false` so your `within()` queries continue to work.
 *
 * @see geoWithin https://docs.mongodb.org/manual/reference/operator/geoWithin/
 * @default true
 * @property use$geoWithin
 * @memberOf Query
 * @static
 * @api public
 */

Query.use$geoWithin = mquery.use$geoWithin;

/**
 * Converts this query to a customized, reusable query constructor with all arguments and options retained.
 *
 * #### Example:
 *
 *     // Create a query for adventure movies and read from the primary
 *     // node in the replica-set unless it is down, in which case we'll
 *     // read from a secondary node.
 *     const query = Movie.find({ tags: 'adventure' }).read('primaryPreferred');
 *
 *     // create a custom Query constructor based off these settings
 *     const Adventure = query.toConstructor();
 *
 *     // Adventure is now a subclass of mongoose.Query and works the same way but with the
 *     // default query parameters and options set.
 *     Adventure().exec(callback)
 *
 *     // further narrow down our query results while still using the previous settings
 *     Adventure().where({ name: /^Life/ }).exec(callback);
 *
 *     // since Adventure is a stand-alone constructor we can also add our own
 *     // helper methods and getters without impacting global queries
 *     Adventure.prototype.startsWith = function (prefix) {
 *       this.where({ name: new RegExp('^' + prefix) })
 *       return this;
 *     }
 *     Object.defineProperty(Adventure.prototype, 'highlyRated', {
 *       get: function () {
 *         this.where({ rating: { $gt: 4.5 }});
 *         return this;
 *       }
 *     })
 *     Adventure().highlyRated.startsWith('Life').exec(callback)
 *
 * @return {Query} subclass-of-Query
 * @api public
 */

Query.prototype.toConstructor = function toConstructor() {
  const model = this.model;
  const coll = this.mongooseCollection;

  const CustomQuery = function(criteria, options) {
    if (!(this instanceof CustomQuery)) {
      return new CustomQuery(criteria, options);
    }
    this._mongooseOptions = utils.clone(p._mongooseOptions);
    Query.call(this, criteria, options || null, model, coll);
  };

  util.inherits(CustomQuery, model.Query);

  // set inherited defaults
  const p = CustomQuery.prototype;

  p.options = {};

  // Need to handle `sort()` separately because entries-style `sort()` syntax
  // `sort([['prop1', 1]])` confuses mquery into losing the outer nested array.
  // See gh-8159
  const options = Object.assign({}, this.options);
  if (options.sort != null) {
    p.sort(options.sort);
    delete options.sort;
  }
  p.setOptions(options);

  p.op = this.op;
  p._validateOp();
  p._conditions = utils.clone(this._conditions);
  p._fields = utils.clone(this._fields);
  p._update = utils.clone(this._update, {
    flattenDecimals: false
  });
  p._path = this._path;
  p._distinct = this._distinct;
  p._collection = this._collection;
  p._mongooseOptions = this._mongooseOptions;

  return CustomQuery;
};

/**
 * Make a copy of this query so you can re-execute it.
 *
 * #### Example:
 *
 *     const q = Book.findOne({ title: 'Casino Royale' });
 *     await q.exec();
 *     await q.exec(); // Throws an error because you can't execute a query twice
 *
 *     await q.clone().exec(); // Works
 *
 * @method clone
 * @return {Query} copy
 * @memberOf Query
 * @instance
 * @api public
 */

Query.prototype.clone = function clone() {
  const model = this.model;
  const collection = this.mongooseCollection;

  const q = new this.model.Query({}, {}, model, collection);

  // Need to handle `sort()` separately because entries-style `sort()` syntax
  // `sort([['prop1', 1]])` confuses mquery into losing the outer nested array.
  // See gh-8159
  const options = Object.assign({}, this.options);
  if (options.sort != null) {
    q.sort(options.sort);
    delete options.sort;
  }
  q.setOptions(options);

  q.op = this.op;
  q._validateOp();
  q._conditions = utils.clone(this._conditions);
  q._fields = utils.clone(this._fields);
  q._update = utils.clone(this._update, {
    flattenDecimals: false
  });
  q._path = this._path;
  q._distinct = this._distinct;
  q._collection = this._collection;
  q._mongooseOptions = this._mongooseOptions;

  return q;
};

/**
 * Specifies a javascript function or expression to pass to MongoDBs query system.
 *
 * #### Example:
 *
 *     query.$where('this.comments.length === 10 || this.name.length === 5')
 *
 *     // or
 *
 *     query.$where(function () {
 *       return this.comments.length === 10 || this.name.length === 5;
 *     })
 *
 * #### Note:
 *
 * Only use `$where` when you have a condition that cannot be met using other MongoDB operators like `$lt`.
 * **Be sure to read about all of [its caveats](https://docs.mongodb.org/manual/reference/operator/where/) before using.**
 *
 * @see $where https://docs.mongodb.org/manual/reference/operator/where/
 * @method $where
 * @param {String|Function} js javascript string or function
 * @return {Query} this
 * @memberOf Query
 * @instance
 * @method $where
 * @api public
 */

/**
 * Specifies a `path` for use with chaining.
 *
 * #### Example:
 *
 *     // instead of writing:
 *     User.find({age: {$gte: 21, $lte: 65}}, callback);
 *
 *     // we can instead write:
 *     User.where('age').gte(21).lte(65);
 *
 *     // passing query conditions is permitted
 *     User.find().where({ name: 'vonderful' })
 *
 *     // chaining
 *     User
 *     .where('age').gte(21).lte(65)
 *     .where('name', /^vonderful/i)
 *     .where('friends').slice(10)
 *     .exec(callback)
 *
 * @method where
 * @memberOf Query
 * @instance
 * @param {String|Object} [path]
 * @param {any} [val]
 * @return {Query} this
 * @api public
 */

/**
 * Specifies a `$slice` projection for an array.
 *
 * #### Example:
 *
 *     query.slice('comments', 5);
 *     query.slice('comments', -5);
 *     query.slice('comments', [10, 5]);
 *     query.where('comments').slice(5);
 *     query.where('comments').slice([-10, 5]);
 *
 * @method slice
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val number/range of elements to slice
 * @return {Query} this
 * @see mongodb https://www.mongodb.org/display/DOCS/Retrieving+a+Subset+of+Fields#RetrievingaSubsetofFields-RetrievingaSubrangeofArrayElements
 * @see $slice https://docs.mongodb.org/manual/reference/projection/slice/#prj._S_slice
 * @api public
 */

Query.prototype.slice = function() {
  if (arguments.length === 0) {
    return this;
  }

  this._validate('slice');

  let path;
  let val;

  if (arguments.length === 1) {
    const arg = arguments[0];
    if (typeof arg === 'object' && !Array.isArray(arg)) {
      const keys = Object.keys(arg);
      const numKeys = keys.length;
      for (let i = 0; i < numKeys; ++i) {
        this.slice(keys[i], arg[keys[i]]);
      }
      return this;
    }
    this._ensurePath('slice');
    path = this._path;
    val = arguments[0];
  } else if (arguments.length === 2) {
    if ('number' === typeof arguments[0]) {
      this._ensurePath('slice');
      path = this._path;
      val = [arguments[0], arguments[1]];
    } else {
      path = arguments[0];
      val = arguments[1];
    }
  } else if (arguments.length === 3) {
    path = arguments[0];
    val = [arguments[1], arguments[2]];
  }

  const p = {};
  p[path] = { $slice: val };
  this.select(p);

  return this;
};

/*!
 * ignore
 */

const validOpsSet = new Set(validOps);

Query.prototype._validateOp = function() {
  if (this.op != null && !validOpsSet.has(this.op)) {
    this.error(new Error('Query has invalid `op`: "' + this.op + '"'));
  }
};

/**
 * Specifies the complementary comparison value for paths specified with `where()`
 *
 * #### Example:
 *
 *     User.where('age').equals(49);
 *
 *     // is the same as
 *
 *     User.where('age', 49);
 *
 * @method equals
 * @memberOf Query
 * @instance
 * @param {Object} val
 * @return {Query} this
 * @api public
 */

/**
 * Specifies arguments for an `$or` condition.
 *
 * #### Example:
 *
 *     query.or([{ color: 'red' }, { status: 'emergency' }]);
 *
 * @see $or https://docs.mongodb.org/manual/reference/operator/or/
 * @method or
 * @memberOf Query
 * @instance
 * @param {Array} array array of conditions
 * @return {Query} this
 * @api public
 */

/**
 * Specifies arguments for a `$nor` condition.
 *
 * #### Example:
 *
 *     query.nor([{ color: 'green' }, { status: 'ok' }]);
 *
 * @see $nor https://docs.mongodb.org/manual/reference/operator/nor/
 * @method nor
 * @memberOf Query
 * @instance
 * @param {Array} array array of conditions
 * @return {Query} this
 * @api public
 */

/**
 * Specifies arguments for a `$and` condition.
 *
 * #### Example:
 *
 *     query.and([{ color: 'green' }, { status: 'ok' }])
 *
 * @method and
 * @memberOf Query
 * @instance
 * @see $and https://docs.mongodb.org/manual/reference/operator/and/
 * @param {Array} array array of conditions
 * @return {Query} this
 * @api public
 */

/**
 * Specifies a `$gt` query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * #### Example:
 *
 *     Thing.find().where('age').gt(21);
 *
 *     // or
 *     Thing.find().gt('age', 21);
 *
 * @method gt
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @see $gt https://docs.mongodb.org/manual/reference/operator/gt/
 * @api public
 */

/**
 * Specifies a `$gte` query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method gte
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @see $gte https://docs.mongodb.org/manual/reference/operator/gte/
 * @api public
 */

/**
 * Specifies a `$lt` query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method lt
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @see $lt https://docs.mongodb.org/manual/reference/operator/lt/
 * @api public
 */

/**
 * Specifies a `$lte` query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method lte
 * @see $lte https://docs.mongodb.org/manual/reference/operator/lte/
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a `$ne` query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @see $ne https://docs.mongodb.org/manual/reference/operator/ne/
 * @method ne
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {any} val
 * @api public
 */

/**
 * Specifies an `$in` query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @see $in https://docs.mongodb.org/manual/reference/operator/in/
 * @method in
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Array} val
 * @api public
 */

/**
 * Specifies an `$nin` query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @see $nin https://docs.mongodb.org/manual/reference/operator/nin/
 * @method nin
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Array} val
 * @api public
 */

/**
 * Specifies an `$all` query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * #### Example:
 *
 *     MyModel.find().where('pets').all(['dog', 'cat', 'ferret']);
 *     // Equivalent:
 *     MyModel.find().all('pets', ['dog', 'cat', 'ferret']);
 *
 * @see $all https://docs.mongodb.org/manual/reference/operator/all/
 * @method all
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Array} val
 * @api public
 */

/**
 * Specifies a `$size` query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * #### Example:
 *
 *     const docs = await MyModel.where('tags').size(0).exec();
 *     assert(Array.isArray(docs));
 *     console.log('documents with 0 tags', docs);
 *
 * @see $size https://docs.mongodb.org/manual/reference/operator/size/
 * @method size
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a `$regex` query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @see $regex https://docs.mongodb.org/manual/reference/operator/regex/
 * @method regex
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {String|RegExp} val
 * @api public
 */

/**
 * Specifies a `maxDistance` query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @see $maxDistance https://docs.mongodb.org/manual/reference/operator/maxDistance/
 * @method maxDistance
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a `$mod` condition, filters documents for documents whose
 * `path` property is a number that is equal to `remainder` modulo `divisor`.
 *
 * #### Example:
 *
 *     // All find products whose inventory is odd
 *     Product.find().mod('inventory', [2, 1]);
 *     Product.find().where('inventory').mod([2, 1]);
 *     // This syntax is a little strange, but supported.
 *     Product.find().where('inventory').mod(2, 1);
 *
 * @method mod
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Array} val must be of length 2, first element is `divisor`, 2nd element is `remainder`.
 * @return {Query} this
 * @see $mod https://docs.mongodb.org/manual/reference/operator/mod/
 * @api public
 */

Query.prototype.mod = function() {
  let val;
  let path;

  if (arguments.length === 1) {
    this._ensurePath('mod');
    val = arguments[0];
    path = this._path;
  } else if (arguments.length === 2 && !Array.isArray(arguments[1])) {
    this._ensurePath('mod');
    val = [arguments[0], arguments[1]];
    path = this._path;
  } else if (arguments.length === 3) {
    val = [arguments[1], arguments[2]];
    path = arguments[0];
  } else {
    val = arguments[1];
    path = arguments[0];
  }

  const conds = this._conditions[path] || (this._conditions[path] = {});
  conds.$mod = val;
  return this;
};

/**
 * Specifies an `$exists` condition
 *
 * #### Example:
 *
 *     // { name: { $exists: true }}
 *     Thing.where('name').exists()
 *     Thing.where('name').exists(true)
 *     Thing.find().exists('name')
 *
 *     // { name: { $exists: false }}
 *     Thing.where('name').exists(false);
 *     Thing.find().exists('name', false);
 *
 * @method exists
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Boolean} val
 * @return {Query} this
 * @see $exists https://docs.mongodb.org/manual/reference/operator/exists/
 * @api public
 */

/**
 * Specifies an `$elemMatch` condition
 *
 * #### Example:
 *
 *     query.elemMatch('comment', { author: 'autobot', votes: {$gte: 5}})
 *
 *     query.where('comment').elemMatch({ author: 'autobot', votes: {$gte: 5}})
 *
 *     query.elemMatch('comment', function (elem) {
 *       elem.where('author').equals('autobot');
 *       elem.where('votes').gte(5);
 *     })
 *
 *     query.where('comment').elemMatch(function (elem) {
 *       elem.where({ author: 'autobot' });
 *       elem.where('votes').gte(5);
 *     })
 *
 * @method elemMatch
 * @memberOf Query
 * @instance
 * @param {String|Object|Function} path
 * @param {Object|Function} filter
 * @return {Query} this
 * @see $elemMatch https://docs.mongodb.org/manual/reference/operator/elemMatch/
 * @api public
 */

/**
 * Defines a `$within` or `$geoWithin` argument for geo-spatial queries.
 *
 * #### Example:
 *
 *     query.where(path).within().box()
 *     query.where(path).within().circle()
 *     query.where(path).within().geometry()
 *
 *     query.where('loc').within({ center: [50,50], radius: 10, unique: true, spherical: true });
 *     query.where('loc').within({ box: [[40.73, -73.9], [40.7, -73.988]] });
 *     query.where('loc').within({ polygon: [[],[],[],[]] });
 *
 *     query.where('loc').within([], [], []) // polygon
 *     query.where('loc').within([], []) // box
 *     query.where('loc').within({ type: 'LineString', coordinates: [...] }); // geometry
 *
 * **MUST** be used after `where()`.
 *
 * #### Note:
 *
 * As of Mongoose 3.7, `$geoWithin` is always used for queries. To change this behavior, see [Query.use$geoWithin](#query_Query-use%2524geoWithin).
 *
 * #### Note:
 *
 * In Mongoose 3.7, `within` changed from a getter to a function. If you need the old syntax, use [this](https://github.com/ebensing/mongoose-within).
 *
 * @method within
 * @see $polygon https://docs.mongodb.org/manual/reference/operator/polygon/
 * @see $box https://docs.mongodb.org/manual/reference/operator/box/
 * @see $geometry https://docs.mongodb.org/manual/reference/operator/geometry/
 * @see $center https://docs.mongodb.org/manual/reference/operator/center/
 * @see $centerSphere https://docs.mongodb.org/manual/reference/operator/centerSphere/
 * @memberOf Query
 * @instance
 * @return {Query} this
 * @api public
 */

/**
 * Specifies the maximum number of documents the query will return.
 *
 * #### Example:
 *
 *     query.limit(20);
 *
 * #### Note:
 *
 * Cannot be used with `distinct()`
 *
 * @method limit
 * @memberOf Query
 * @instance
 * @param {Number} val
 * @api public
 */

Query.prototype.limit = function limit(v) {
  this._validate('limit');

  if (typeof v === 'string') {
    try {
      v = castNumber(v);
    } catch (err) {
      throw new CastError('Number', v, 'limit');
    }
  }

  this.options.limit = v;
  return this;
};

/**
 * Specifies the number of documents to skip.
 *
 * #### Example:
 *
 *     query.skip(100).limit(20);
 *
 * #### Note:
 *
 * Cannot be used with `distinct()`
 *
 * @method skip
 * @memberOf Query
 * @instance
 * @param {Number} val
 * @see cursor.skip https://docs.mongodb.org/manual/reference/method/cursor.skip/
 * @api public
 */

Query.prototype.skip = function skip(v) {
  this._validate('skip');

  if (typeof v === 'string') {
    try {
      v = castNumber(v);
    } catch (err) {
      throw new CastError('Number', v, 'skip');
    }
  }

  this.options.skip = v;
  return this;
};

/**
 * Specifies the maxScan option.
 *
 * #### Example:
 *
 *     query.maxScan(100);
 *
 * #### Note:
 *
 * Cannot be used with `distinct()`
 *
 * @method maxScan
 * @memberOf Query
 * @instance
 * @param {Number} val
 * @see maxScan https://docs.mongodb.org/manual/reference/operator/maxScan/
 * @api public
 */

/**
 * Specifies the batchSize option.
 *
 * #### Example:
 *
 *     query.batchSize(100)
 *
 * #### Note:
 *
 * Cannot be used with `distinct()`
 *
 * @method batchSize
 * @memberOf Query
 * @instance
 * @param {Number} val
 * @see batchSize https://docs.mongodb.org/manual/reference/method/cursor.batchSize/
 * @api public
 */

/**
 * Specifies the `comment` option.
 *
 * #### Example:
 *
 *     query.comment('login query')
 *
 * #### Note:
 *
 * Cannot be used with `distinct()`
 *
 * @method comment
 * @memberOf Query
 * @instance
 * @param {String} val
 * @see comment https://docs.mongodb.org/manual/reference/operator/comment/
 * @api public
 */

/**
 * Specifies this query as a `snapshot` query.
 *
 * #### Example:
 *
 *     query.snapshot(); // true
 *     query.snapshot(true);
 *     query.snapshot(false);
 *
 * #### Note:
 *
 * Cannot be used with `distinct()`
 *
 * @method snapshot
 * @memberOf Query
 * @instance
 * @see snapshot https://docs.mongodb.org/manual/reference/operator/snapshot/
 * @return {Query} this
 * @api public
 */

/**
 * Sets query hints.
 *
 * #### Example:
 *
 *     query.hint({ indexA: 1, indexB: -1 });
 *
 * #### Note:
 *
 * Cannot be used with `distinct()`
 *
 * @method hint
 * @memberOf Query
 * @instance
 * @param {Object} val a hint object
 * @return {Query} this
 * @see $hint https://docs.mongodb.org/manual/reference/operator/hint/
 * @api public
 */

/**
 * Get/set the current projection (AKA fields). Pass `null` to remove the
 * current projection.
 *
 * Unlike `projection()`, the `select()` function modifies the current
 * projection in place. This function overwrites the existing projection.
 *
 * #### Example:
 *
 *     const q = Model.find();
 *     q.projection(); // null
 *
 *     q.select('a b');
 *     q.projection(); // { a: 1, b: 1 }
 *
 *     q.projection({ c: 1 });
 *     q.projection(); // { c: 1 }
 *
 *     q.projection(null);
 *     q.projection(); // null
 *
 *
 * @method projection
 * @memberOf Query
 * @instance
 * @param {Object|null} arg
 * @return {Object} the current projection
 * @api public
 */

Query.prototype.projection = function(arg) {
  if (arguments.length === 0) {
    return this._fields;
  }

  this._fields = {};
  this._userProvidedFields = {};
  this.select(arg);
  return this._fields;
};

/**
 * Specifies which document fields to include or exclude (also known as the query "projection")
 *
 * When using string syntax, prefixing a path with `-` will flag that path as excluded. When a path does not have the `-` prefix, it is included. Lastly, if a path is prefixed with `+`, it forces inclusion of the path, which is useful for paths excluded at the [schema level](/docs/api.html#schematype_SchemaType-select).
 *
 * A projection _must_ be either inclusive or exclusive. In other words, you must
 * either list the fields to include (which excludes all others), or list the fields
 * to exclude (which implies all other fields are included). The [`_id` field is the only exception because MongoDB includes it by default](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/#suppress-id-field).
 *
 * #### Example:
 *
 *     // include a and b, exclude other fields
 *     query.select('a b');
 *     // Equivalent syntaxes:
 *     query.select(['a', 'b']);
 *     query.select({ a: 1, b: 1 });
 *
 *     // exclude c and d, include other fields
 *     query.select('-c -d');
 *
 *     // Use `+` to override schema-level `select: false` without making the
 *     // projection inclusive.
 *     const schema = new Schema({
 *       foo: { type: String, select: false },
 *       bar: String
 *     });
 *     // ...
 *     query.select('+foo'); // Override foo's `select: false` without excluding `bar`
 *
 *     // or you may use object notation, useful when
 *     // you have keys already prefixed with a "-"
 *     query.select({ a: 1, b: 1 });
 *     query.select({ c: 0, d: 0 });
 *
 *     Additional calls to select can override the previous selection:
 *     query.select({ a: 1, b: 1 }).select({ b: 0 }); // selection is now { a: 1 }
 *     query.select({ a: 0, b: 0 }).select({ b: 1 }); // selection is now { a: 0 }
 *
 *
 * @method select
 * @memberOf Query
 * @instance
 * @param {Object|String|String[]} arg
 * @return {Query} this
 * @see SchemaType /docs/api/schematype
 * @api public
 */

Query.prototype.select = function select() {
  let arg = arguments[0];
  if (!arg) return this;

  if (arguments.length !== 1) {
    throw new Error('Invalid select: select only takes 1 argument');
  }

  this._validate('select');

  const fields = this._fields || (this._fields = {});
  const userProvidedFields = this._userProvidedFields || (this._userProvidedFields = {});
  let sanitizeProjection = undefined;
  if (this.model != null && utils.hasUserDefinedProperty(this.model.db.options, 'sanitizeProjection')) {
    sanitizeProjection = this.model.db.options.sanitizeProjection;
  } else if (this.model != null && utils.hasUserDefinedProperty(this.model.base.options, 'sanitizeProjection')) {
    sanitizeProjection = this.model.base.options.sanitizeProjection;
  } else {
    sanitizeProjection = this._mongooseOptions.sanitizeProjection;
  }

  function sanitizeValue(value) {
    return typeof value === 'string' && sanitizeProjection ? value = 1 : value;
  }

  arg = parseProjection(arg);

  if (utils.isObject(arg)) {
    if (this.selectedInclusively()) {
      Object.entries(arg).forEach(([key, value]) => {
        if (value) {
          // Add the field to the projection
          fields[key] = userProvidedFields[key] = sanitizeValue(value);
        } else {
          // Remove the field from the projection
          Object.keys(userProvidedFields).forEach(field => {
            if (isSubpath(key, field)) {
              delete fields[field];
              delete userProvidedFields[field];
            }
          });
        }
      });
    } else if (this.selectedExclusively()) {
      Object.entries(arg).forEach(([key, value]) => {
        if (!value) {
          // Add the field to the projection
          fields[key] = userProvidedFields[key] = sanitizeValue(value);
        } else {
          // Remove the field from the projection
          Object.keys(userProvidedFields).forEach(field => {
            if (isSubpath(key, field)) {
              delete fields[field];
              delete userProvidedFields[field];
            }
          });
        }
      });
    } else {
      const keys = Object.keys(arg);
      for (let i = 0; i < keys.length; ++i) {
        const value = arg[keys[i]];
        fields[keys[i]] = sanitizeValue(value);
        userProvidedFields[keys[i]] = sanitizeValue(value);
      }
    }
    return this;
  }

  throw new TypeError('Invalid select() argument. Must be string or object.');
};

/**
 * Determines the MongoDB nodes from which to read.
 *
 * #### Preferences:
 *
 * ```
 * primary - (default) Read from primary only. Operations will produce an error if primary is unavailable. Cannot be combined with tags.
 * secondary            Read from secondary if available, otherwise error.
 * primaryPreferred     Read from primary if available, otherwise a secondary.
 * secondaryPreferred   Read from a secondary if available, otherwise read from the primary.
 * nearest              All operations read from among the nearest candidates, but unlike other modes, this option will include both the primary and all secondaries in the random selection.
 * ```
 *
 * Aliases
 *
 * ```
 * p   primary
 * pp  primaryPreferred
 * s   secondary
 * sp  secondaryPreferred
 * n   nearest
 * ```
 *
 * #### Example:
 *
 *     new Query().read('primary')
 *     new Query().read('p')  // same as primary
 *
 *     new Query().read('primaryPreferred')
 *     new Query().read('pp') // same as primaryPreferred
 *
 *     new Query().read('secondary')
 *     new Query().read('s')  // same as secondary
 *
 *     new Query().read('secondaryPreferred')
 *     new Query().read('sp') // same as secondaryPreferred
 *
 *     new Query().read('nearest')
 *     new Query().read('n')  // same as nearest
 *
 *     // read from secondaries with matching tags
 *     new Query().read('s', [{ dc:'sf', s: 1 },{ dc:'ma', s: 2 }])
 *
 * Read more about how to use read preferences [here](https://docs.mongodb.org/manual/applications/replication/#read-preference).
 *
 * @method read
 * @memberOf Query
 * @instance
 * @param {String} pref one of the listed preference options or aliases
 * @param {Array} [tags] optional tags for this query
 * @see mongodb https://docs.mongodb.org/manual/applications/replication/#read-preference
 * @return {Query} this
 * @api public
 */

Query.prototype.read = function read(pref, tags) {
  // first cast into a ReadPreference object to support tags
  const read = new ReadPreference(pref, tags);
  this.options.readPreference = read;
  return this;
};

/**
 * Overwrite default `.toString` to make logging more useful
 *
 * @memberOf Query
 * @instance
 * @method toString
 * @api private
 */

Query.prototype.toString = function toString() {
  if (this.op === 'count' ||
      this.op === 'countDocuments' ||
      this.op === 'find' ||
      this.op === 'findOne' ||
      this.op === 'deleteMany' ||
      this.op === 'deleteOne' ||
      this.op === 'findOneAndDelete' ||
      this.op === 'findOneAndRemove' ||
      this.op === 'remove') {
    return `${this.model.modelName}.${this.op}(${util.inspect(this._conditions)})`;
  }
  if (this.op === 'distinct') {
    return `${this.model.modelName}.distinct('${this._distinct}', ${util.inspect(this._conditions)})`;
  }
  if (this.op === 'findOneAndReplace' ||
      this.op === 'findOneAndUpdate' ||
      this.op === 'replaceOne' ||
      this.op === 'update' ||
      this.op === 'updateMany' ||
      this.op === 'updateOne') {
    return `${this.model.modelName}.${this.op}(${util.inspect(this._conditions)}, ${util.inspect(this._update)})`;
  }

  // 'estimatedDocumentCount' or any others
  return `${this.model.modelName}.${this.op}()`;
};

/**
 * Sets the [MongoDB session](https://docs.mongodb.com/manual/reference/server-sessions/)
 * associated with this query. Sessions are how you mark a query as part of a
 * [transaction](/docs/transactions.html).
 *
 * Calling `session(null)` removes the session from this query.
 *
 * #### Example:
 *
 *     const s = await mongoose.startSession();
 *     await mongoose.model('Person').findOne({ name: 'Axl Rose' }).session(s);
 *
 * @method session
 * @memberOf Query
 * @instance
 * @param {ClientSession} [session] from `await conn.startSession()`
 * @see Connection.prototype.startSession() /docs/api.html#connection_Connection-startSession
 * @see mongoose.startSession() /docs/api.html#mongoose_Mongoose-startSession
 * @return {Query} this
 * @api public
 */

Query.prototype.session = function session(v) {
  if (v == null) {
    delete this.options.session;
  }
  this.options.session = v;
  return this;
};

/**
 * Sets the 3 write concern parameters for this query:
 *
 * - `w`: Sets the specified number of `mongod` servers, or tag set of `mongod` servers, that must acknowledge this write before this write is considered successful.
 * - `j`: Boolean, set to `true` to request acknowledgement that this operation has been persisted to MongoDB's on-disk journal.
 * - `wtimeout`: If [`w > 1`](/docs/api.html#query_Query-w), the maximum amount of time to wait for this write to propagate through the replica set before this operation fails. The default is `0`, which means no timeout.
 *
 * This option is only valid for operations that write to the database:
 *
 * - `deleteOne()`
 * - `deleteMany()`
 * - `findOneAndDelete()`
 * - `findOneAndReplace()`
 * - `findOneAndUpdate()`
 * - `remove()`
 * - `update()`
 * - `updateOne()`
 * - `updateMany()`
 *
 * Defaults to the schema's [`writeConcern` option](/docs/guide.html#writeConcern)
 *
 * #### Example:
 *
 *     // The 'majority' option means the `deleteOne()` promise won't resolve
 *     // until the `deleteOne()` has propagated to the majority of the replica set
 *     await mongoose.model('Person').
 *       deleteOne({ name: 'Ned Stark' }).
 *       writeConcern({ w: 'majority' });
 *
 * @method writeConcern
 * @memberOf Query
 * @instance
 * @param {Object} writeConcern the write concern value to set
 * @see WriteConcernSettings https://mongodb.github.io/node-mongodb-native/4.9/interfaces/WriteConcernSettings.html
 * @return {Query} this
 * @api public
 */

Query.prototype.writeConcern = function writeConcern(val) {
  if (val == null) {
    delete this.options.writeConcern;
    return this;
  }
  this.options.writeConcern = val;
  return this;
};

/**
 * Sets the specified number of `mongod` servers, or tag set of `mongod` servers,
 * that must acknowledge this write before this write is considered successful.
 * This option is only valid for operations that write to the database:
 *
 * - `deleteOne()`
 * - `deleteMany()`
 * - `findOneAndDelete()`
 * - `findOneAndReplace()`
 * - `findOneAndUpdate()`
 * - `remove()`
 * - `update()`
 * - `updateOne()`
 * - `updateMany()`
 *
 * Defaults to the schema's [`writeConcern.w` option](/docs/guide.html#writeConcern)
 *
 * #### Example:
 *
 *     // The 'majority' option means the `deleteOne()` promise won't resolve
 *     // until the `deleteOne()` has propagated to the majority of the replica set
 *     await mongoose.model('Person').
 *       deleteOne({ name: 'Ned Stark' }).
 *       w('majority');
 *
 * @method w
 * @memberOf Query
 * @instance
 * @param {String|number} val 0 for fire-and-forget, 1 for acknowledged by one server, 'majority' for majority of the replica set, or [any of the more advanced options](https://docs.mongodb.com/manual/reference/write-concern/#w-option).
 * @see mongodb https://docs.mongodb.com/manual/reference/write-concern/#w-option
 * @return {Query} this
 * @api public
 */

Query.prototype.w = function w(val) {
  if (val == null) {
    delete this.options.w;
  }
  if (this.options.writeConcern != null) {
    this.options.writeConcern.w = val;
  } else {
    this.options.w = val;
  }
  return this;
};

/**
 * Requests acknowledgement that this operation has been persisted to MongoDB's
 * on-disk journal.
 * This option is only valid for operations that write to the database:
 *
 * - `deleteOne()`
 * - `deleteMany()`
 * - `findOneAndDelete()`
 * - `findOneAndReplace()`
 * - `findOneAndUpdate()`
 * - `remove()`
 * - `update()`
 * - `updateOne()`
 * - `updateMany()`
 *
 * Defaults to the schema's [`writeConcern.j` option](/docs/guide.html#writeConcern)
 *
 * #### Example:
 *
 *     await mongoose.model('Person').deleteOne({ name: 'Ned Stark' }).j(true);
 *
 * @method j
 * @memberOf Query
 * @instance
 * @param {boolean} val
 * @see mongodb https://docs.mongodb.com/manual/reference/write-concern/#j-option
 * @return {Query} this
 * @api public
 */

Query.prototype.j = function j(val) {
  if (val == null) {
    delete this.options.j;
  }
  if (this.options.writeConcern != null) {
    this.options.writeConcern.j = val;
  } else {
    this.options.j = val;
  }
  return this;
};

/**
 * If [`w > 1`](/docs/api.html#query_Query-w), the maximum amount of time to
 * wait for this write to propagate through the replica set before this
 * operation fails. The default is `0`, which means no timeout.
 *
 * This option is only valid for operations that write to the database:
 *
 * - `deleteOne()`
 * - `deleteMany()`
 * - `findOneAndDelete()`
 * - `findOneAndReplace()`
 * - `findOneAndUpdate()`
 * - `remove()`
 * - `update()`
 * - `updateOne()`
 * - `updateMany()`
 *
 * Defaults to the schema's [`writeConcern.wtimeout` option](/docs/guide.html#writeConcern)
 *
 * #### Example:
 *
 *     // The `deleteOne()` promise won't resolve until this `deleteOne()` has
 *     // propagated to at least `w = 2` members of the replica set. If it takes
 *     // longer than 1 second, this `deleteOne()` will fail.
 *     await mongoose.model('Person').
 *       deleteOne({ name: 'Ned Stark' }).
 *       w(2).
 *       wtimeout(1000);
 *
 * @method wtimeout
 * @memberOf Query
 * @instance
 * @param {number} ms number of milliseconds to wait
 * @see mongodb https://docs.mongodb.com/manual/reference/write-concern/#wtimeout
 * @return {Query} this
 * @api public
 */

Query.prototype.wtimeout = function wtimeout(ms) {
  if (ms == null) {
    delete this.options.wtimeout;
  }
  if (this.options.writeConcern != null) {
    this.options.writeConcern.wtimeout = ms;
  } else {
    this.options.wtimeout = ms;
  }
  return this;
};

/**
 * Sets the readConcern option for the query.
 *
 * #### Example:
 *
 *     new Query().readConcern('local')
 *     new Query().readConcern('l')  // same as local
 *
 *     new Query().readConcern('available')
 *     new Query().readConcern('a')  // same as available
 *
 *     new Query().readConcern('majority')
 *     new Query().readConcern('m')  // same as majority
 *
 *     new Query().readConcern('linearizable')
 *     new Query().readConcern('lz') // same as linearizable
 *
 *     new Query().readConcern('snapshot')
 *     new Query().readConcern('s')  // same as snapshot
 *
 *
 * #### Read Concern Level:
 *
 * ```
 * local         MongoDB 3.2+ The query returns from the instance with no guarantee guarantee that the data has been written to a majority of the replica set members (i.e. may be rolled back).
 * available     MongoDB 3.6+ The query returns from the instance with no guarantee guarantee that the data has been written to a majority of the replica set members (i.e. may be rolled back).
 * majority      MongoDB 3.2+ The query returns the data that has been acknowledged by a majority of the replica set members. The documents returned by the read operation are durable, even in the event of failure.
 * linearizable  MongoDB 3.4+ The query returns data that reflects all successful majority-acknowledged writes that completed prior to the start of the read operation. The query may wait for concurrently executing writes to propagate to a majority of replica set members before returning results.
 * snapshot      MongoDB 4.0+ Only available for operations within multi-document transactions. Upon transaction commit with write concern "majority", the transaction operations are guaranteed to have read from a snapshot of majority-committed data.
 * ```
 *
 * Aliases
 *
 * ```
 * l   local
 * a   available
 * m   majority
 * lz  linearizable
 * s   snapshot
 * ```
 *
 * Read more about how to use read concern [here](https://docs.mongodb.com/manual/reference/read-concern/).
 *
 * @memberOf Query
 * @method readConcern
 * @param {String} level one of the listed read concern level or their aliases
 * @see mongodb https://docs.mongodb.com/manual/reference/read-concern/
 * @return {Query} this
 * @api public
 */

/**
 * Gets query options.
 *
 * #### Example:
 *
 *     const query = new Query();
 *     query.limit(10);
 *     query.setOptions({ maxTimeMS: 1000 });
 *     query.getOptions(); // { limit: 10, maxTimeMS: 1000 }
 *
 * @return {Object} the options
 * @api public
 */

Query.prototype.getOptions = function() {
  return this.options;
};

/**
 * Sets query options. Some options only make sense for certain operations.
 *
 * #### Options:
 *
 * The following options are only for `find()`:
 *
 * - [tailable](https://www.mongodb.org/display/DOCS/Tailable+Cursors)
 * - [sort](https://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsort(\)%7D%7D)
 * - [limit](https://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Blimit%28%29%7D%7D)
 * - [skip](https://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bskip%28%29%7D%7D)
 * - [allowDiskUse](https://docs.mongodb.com/manual/reference/method/cursor.allowDiskUse/)
 * - [batchSize](https://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7BbatchSize%28%29%7D%7D)
 * - [readPreference](https://docs.mongodb.org/manual/applications/replication/#read-preference)
 * - [hint](https://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24hint)
 * - [comment](https://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24comment)
 * - [snapshot](https://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsnapshot%28%29%7D%7D)
 * - [maxscan](https://docs.mongodb.org/v3.2/reference/operator/meta/maxScan/#metaOp._S_maxScan)
 *
 * The following options are only for write operations: `update()`, `updateOne()`, `updateMany()`, `replaceOne()`, `findOneAndUpdate()`, and `findByIdAndUpdate()`:
 *
 * - [upsert](https://docs.mongodb.com/manual/reference/method/db.collection.update/)
 * - [writeConcern](https://docs.mongodb.com/manual/reference/method/db.collection.update/)
 * - [timestamps](https://mongoosejs.com/docs/guide.html#timestamps): If `timestamps` is set in the schema, set this option to `false` to skip timestamps for that particular update. Has no effect if `timestamps` is not enabled in the schema options.
 * - overwriteDiscriminatorKey: allow setting the discriminator key in the update. Will use the correct discriminator schema if the update changes the discriminator key.
 *
 * The following options are only for `find()`, `findOne()`, `findById()`, `findOneAndUpdate()`, and `findByIdAndUpdate()`:
 *
 * - [lean](./api.html#query_Query-lean)
 * - [populate](/docs/populate.html)
 * - [projection](/docs/api/query.html#query_Query-projection)
 * - sanitizeProjection
 *
 * The following options are only for all operations **except** `update()`, `updateOne()`, `updateMany()`, `remove()`, `deleteOne()`, and `deleteMany()`:
 *
 * - [maxTimeMS](https://docs.mongodb.com/manual/reference/operator/meta/maxTimeMS/)
 *
 * The following options are for `findOneAndUpdate()` and `findOneAndRemove()`
 *
 * - rawResult
 *
 * The following options are for all operations:
 *
 * - [strict](/docs/guide.html#strict)
 * - [collation](https://docs.mongodb.com/manual/reference/collation/)
 * - [session](https://docs.mongodb.com/manual/reference/server-sessions/)
 * - [explain](https://docs.mongodb.com/manual/reference/method/cursor.explain/)
 *
 * @param {Object} options
 * @return {Query} this
 * @api public
 */

Query.prototype.setOptions = function(options, overwrite) {
  // overwrite is only for internal use
  if (overwrite) {
    // ensure that _mongooseOptions & options are two different objects
    this._mongooseOptions = (options && utils.clone(options)) || {};
    this.options = options || {};

    if ('populate' in options) {
      this.populate(this._mongooseOptions);
    }
    return this;
  }
  if (options == null) {
    return this;
  }
  if (typeof options !== 'object') {
    throw new Error('Options must be an object, got "' + options + '"');
  }

  options = Object.assign({}, options);

  if (Array.isArray(options.populate)) {
    const populate = options.populate;
    delete options.populate;
    const _numPopulate = populate.length;
    for (let i = 0; i < _numPopulate; ++i) {
      this.populate(populate[i]);
    }
  }

  if ('setDefaultsOnInsert' in options) {
    this._mongooseOptions.setDefaultsOnInsert = options.setDefaultsOnInsert;
    delete options.setDefaultsOnInsert;
  }
  if ('overwriteDiscriminatorKey' in options) {
    this._mongooseOptions.overwriteDiscriminatorKey = options.overwriteDiscriminatorKey;
    delete options.overwriteDiscriminatorKey;
  }
  if ('sanitizeProjection' in options) {
    if (options.sanitizeProjection && !this._mongooseOptions.sanitizeProjection) {
      sanitizeProjection(this._fields);
    }

    this._mongooseOptions.sanitizeProjection = options.sanitizeProjection;
    delete options.sanitizeProjection;
  }
  if ('sanitizeFilter' in options) {
    this._mongooseOptions.sanitizeFilter = options.sanitizeFilter;
    delete options.sanitizeFilter;
  }

  if ('defaults' in options) {
    this._mongooseOptions.defaults = options.defaults;
    // deleting options.defaults will cause 7287 to fail
  }
  if (options.lean == null && this.schema && 'lean' in this.schema.options) {
    this._mongooseOptions.lean = this.schema.options.lean;
  }

  if (typeof options.limit === 'string') {
    try {
      options.limit = castNumber(options.limit);
    } catch (err) {
      throw new CastError('Number', options.limit, 'limit');
    }
  }
  if (typeof options.skip === 'string') {
    try {
      options.skip = castNumber(options.skip);
    } catch (err) {
      throw new CastError('Number', options.skip, 'skip');
    }
  }

  // set arbitrary options
  for (const key of Object.keys(options)) {
    if (queryOptionMethods.has(key)) {
      const args = Array.isArray(options[key]) ?
        options[key] :
        [options[key]];
      this[key].apply(this, args);
    } else {
      this.options[key] = options[key];
    }
  }

  return this;
};

/**
 * Sets the [`explain` option](https://docs.mongodb.com/manual/reference/method/cursor.explain/),
 * which makes this query return detailed execution stats instead of the actual
 * query result. This method is useful for determining what index your queries
 * use.
 *
 * Calling `query.explain(v)` is equivalent to `query.setOptions({ explain: v })`
 *
 * #### Example:
 *
 *     const query = new Query();
 *     const res = await query.find({ a: 1 }).explain('queryPlanner');
 *     console.log(res);
 *
 * @param {String} [verbose] The verbosity mode. Either 'queryPlanner', 'executionStats', or 'allPlansExecution'. The default is 'queryPlanner'
 * @return {Query} this
 * @api public
 */

Query.prototype.explain = function(verbose) {
  if (arguments.length === 0) {
    this.options.explain = true;
  } else if (verbose === false) {
    delete this.options.explain;
  } else {
    this.options.explain = verbose;
  }
  return this;
};

/**
 * Sets the [`allowDiskUse` option](https://docs.mongodb.com/manual/reference/method/cursor.allowDiskUse/),
 * which allows the MongoDB server to use more than 100 MB for this query's `sort()`. This option can
 * let you work around `QueryExceededMemoryLimitNoDiskUseAllowed` errors from the MongoDB server.
 *
 * Note that this option requires MongoDB server >= 4.4. Setting this option is a no-op for MongoDB 4.2
 * and earlier.
 *
 * Calling `query.allowDiskUse(v)` is equivalent to `query.setOptions({ allowDiskUse: v })`
 *
 * #### Example:
 *
 *     await query.find().sort({ name: 1 }).allowDiskUse(true);
 *     // Equivalent:
 *     await query.find().sort({ name: 1 }).allowDiskUse();
 *
 * @param {Boolean} [v] Enable/disable `allowDiskUse`. If called with 0 arguments, sets `allowDiskUse: true`
 * @return {Query} this
 * @api public
 */

Query.prototype.allowDiskUse = function(v) {
  if (arguments.length === 0) {
    this.options.allowDiskUse = true;
  } else if (v === false) {
    delete this.options.allowDiskUse;
  } else {
    this.options.allowDiskUse = v;
  }
  return this;
};

/**
 * Sets the [maxTimeMS](https://docs.mongodb.com/manual/reference/method/cursor.maxTimeMS/)
 * option. This will tell the MongoDB server to abort if the query or write op
 * has been running for more than `ms` milliseconds.
 *
 * Calling `query.maxTimeMS(v)` is equivalent to `query.setOptions({ maxTimeMS: v })`
 *
 * #### Example:
 *
 *     const query = new Query();
 *     // Throws an error 'operation exceeded time limit' as long as there's
 *     // >= 1 doc in the queried collection
 *     const res = await query.find({ $where: 'sleep(1000) || true' }).maxTimeMS(100);
 *
 * @param {Number} [ms] The number of milliseconds
 * @return {Query} this
 * @api public
 */

Query.prototype.maxTimeMS = function(ms) {
  this.options.maxTimeMS = ms;
  return this;
};

/**
 * Returns the current query filter (also known as conditions) as a [POJO](https://masteringjs.io/tutorials/fundamentals/pojo).
 *
 * #### Example:
 *
 *     const query = new Query();
 *     query.find({ a: 1 }).where('b').gt(2);
 *     query.getFilter(); // { a: 1, b: { $gt: 2 } }
 *
 * @return {Object} current query filter
 * @api public
 */

Query.prototype.getFilter = function() {
  return this._conditions;
};

/**
 * Returns the current query filter. Equivalent to `getFilter()`.
 *
 * You should use `getFilter()` instead of `getQuery()` where possible. `getQuery()`
 * will likely be deprecated in a future release.
 *
 * #### Example:
 *
 *     const query = new Query();
 *     query.find({ a: 1 }).where('b').gt(2);
 *     query.getQuery(); // { a: 1, b: { $gt: 2 } }
 *
 * @return {Object} current query filter
 * @api public
 */

Query.prototype.getQuery = function() {
  return this._conditions;
};

/**
 * Sets the query conditions to the provided JSON object.
 *
 * #### Example:
 *
 *     const query = new Query();
 *     query.find({ a: 1 })
 *     query.setQuery({ a: 2 });
 *     query.getQuery(); // { a: 2 }
 *
 * @param {Object} new query conditions
 * @return {undefined}
 * @api public
 */

Query.prototype.setQuery = function(val) {
  this._conditions = val;
};

/**
 * Returns the current update operations as a JSON object.
 *
 * #### Example:
 *
 *     const query = new Query();
 *     query.update({}, { $set: { a: 5 } });
 *     query.getUpdate(); // { $set: { a: 5 } }
 *
 * @return {Object} current update operations
 * @api public
 */

Query.prototype.getUpdate = function() {
  return this._update;
};

/**
 * Sets the current update operation to new value.
 *
 * #### Example:
 *
 *     const query = new Query();
 *     query.update({}, { $set: { a: 5 } });
 *     query.setUpdate({ $set: { b: 6 } });
 *     query.getUpdate(); // { $set: { b: 6 } }
 *
 * @param {Object} new update operation
 * @return {undefined}
 * @api public
 */

Query.prototype.setUpdate = function(val) {
  this._update = val;
};

/**
 * Returns fields selection for this query.
 *
 * @method _fieldsForExec
 * @return {Object}
 * @api private
 * @memberOf Query
 */

Query.prototype._fieldsForExec = function() {
  return utils.clone(this._fields);
};


/**
 * Return an update document with corrected `$set` operations.
 *
 * @method _updateForExec
 * @return {Object}
 * @api private
 * @memberOf Query
 */

Query.prototype._updateForExec = function() {
  const update = utils.clone(this._update, {
    transform: false,
    depopulate: true
  });
  const ops = Object.keys(update);
  let i = ops.length;
  const ret = {};

  while (i--) {
    const op = ops[i];

    if (this.options.overwrite) {
      ret[op] = update[op];
      continue;
    }

    if ('$' !== op[0]) {
      // fix up $set sugar
      if (!ret.$set) {
        if (update.$set) {
          ret.$set = update.$set;
        } else {
          ret.$set = {};
        }
      }
      ret.$set[op] = update[op];
      ops.splice(i, 1);
      if (!~ops.indexOf('$set')) ops.push('$set');
    } else if ('$set' === op) {
      if (!ret.$set) {
        ret[op] = update[op];
      }
    } else {
      ret[op] = update[op];
    }
  }

  return ret;
};

/**
 * Makes sure _path is set.
 *
 * This method is inherited by `mquery`
 *
 * @method _ensurePath
 * @param {String} method
 * @api private
 * @memberOf Query
 */

/**
 * Determines if `conds` can be merged using `mquery().merge()`
 *
 * @method canMerge
 * @memberOf Query
 * @instance
 * @param {Object} conds
 * @return {Boolean}
 * @api private
 */

/**
 * Returns default options for this query.
 *
 * @param {Model} model
 * @api private
 */

Query.prototype._optionsForExec = function(model) {
  const options = utils.clone(this.options);
  delete options.populate;
  model = model || this.model;

  if (!model) {
    return options;
  }

  // Apply schema-level `writeConcern` option
  applyWriteConcern(model.schema, options);

  const readPreference = model &&
  model.schema &&
  model.schema.options &&
  model.schema.options.read;
  if (!('readPreference' in options) && readPreference) {
    options.readPreference = readPreference;
  }

  if (options.upsert !== void 0) {
    options.upsert = !!options.upsert;
  }
  if (options.writeConcern) {
    if (options.j) {
      options.writeConcern.j = options.j;
      delete options.j;
    }
    if (options.w) {
      options.writeConcern.w = options.w;
      delete options.w;
    }
    if (options.wtimeout) {
      options.writeConcern.wtimeout = options.wtimeout;
      delete options.wtimeout;
    }
  }
  return options;
};

/**
 * Sets the lean option.
 *
 * Documents returned from queries with the `lean` option enabled are plain
 * javascript objects, not [Mongoose Documents](/api/document.html). They have no
 * `save` method, getters/setters, virtuals, or other Mongoose features.
 *
 * #### Example:
 *
 *     new Query().lean() // true
 *     new Query().lean(true)
 *     new Query().lean(false)
 *
 *     const docs = await Model.find().lean();
 *     docs[0] instanceof mongoose.Document; // false
 *
 * [Lean is great for high-performance, read-only cases](/docs/tutorials/lean.html),
 * especially when combined
 * with [cursors](/docs/queries.html#streaming).
 *
 * If you need virtuals, getters/setters, or defaults with `lean()`, you need
 * to use a plugin. See:
 *
 * - [mongoose-lean-virtuals](https://plugins.mongoosejs.io/plugins/lean-virtuals)
 * - [mongoose-lean-getters](https://plugins.mongoosejs.io/plugins/lean-getters)
 * - [mongoose-lean-defaults](https://www.npmjs.com/package/mongoose-lean-defaults)
 *
 * @param {Boolean|Object} bool defaults to true
 * @return {Query} this
 * @api public
 */

Query.prototype.lean = function(v) {
  this._mongooseOptions.lean = arguments.length ? v : true;
  return this;
};

/**
 * Adds a `$set` to this query's update without changing the operation.
 * This is useful for query middleware so you can add an update regardless
 * of whether you use `updateOne()`, `updateMany()`, `findOneAndUpdate()`, etc.
 *
 * #### Example:
 *
 *     // Updates `{ $set: { updatedAt: new Date() } }`
 *     new Query().updateOne({}, {}).set('updatedAt', new Date());
 *     new Query().updateMany({}, {}).set({ updatedAt: new Date() });
 *
 * @param {String|Object} path path or object of key/value pairs to set
 * @param {Any} [val] the value to set
 * @return {Query} this
 * @api public
 */

Query.prototype.set = function(path, val) {
  if (typeof path === 'object') {
    const keys = Object.keys(path);
    for (const key of keys) {
      this.set(key, path[key]);
    }
    return this;
  }

  this._update = this._update || {};
  if (path in this._update) {
    delete this._update[path];
  }
  this._update.$set = this._update.$set || {};
  this._update.$set[path] = val;
  return this;
};

/**
 * For update operations, returns the value of a path in the update's `$set`.
 * Useful for writing getters/setters that can work with both update operations
 * and `save()`.
 *
 * #### Example:
 *
 *     const query = Model.updateOne({}, { $set: { name: 'Jean-Luc Picard' } });
 *     query.get('name'); // 'Jean-Luc Picard'
 *
 * @param {String|Object} path path or object of key/value pairs to get
 * @return {Query} this
 * @api public
 */

Query.prototype.get = function get(path) {
  const update = this._update;
  if (update == null) {
    return void 0;
  }
  const $set = update.$set;
  if ($set == null) {
    return update[path];
  }

  if (utils.hasUserDefinedProperty(update, path)) {
    return update[path];
  }
  if (utils.hasUserDefinedProperty($set, path)) {
    return $set[path];
  }

  return void 0;
};

/**
 * Gets/sets the error flag on this query. If this flag is not null or
 * undefined, the `exec()` promise will reject without executing.
 *
 * #### Example:
 *
 *     Query().error(); // Get current error value
 *     Query().error(null); // Unset the current error
 *     Query().error(new Error('test')); // `exec()` will resolve with test
 *     Schema.pre('find', function() {
 *       if (!this.getQuery().userId) {
 *         this.error(new Error('Not allowed to query without setting userId'));
 *       }
 *     });
 *
 * Note that query casting runs **after** hooks, so cast errors will override
 * custom errors.
 *
 * #### Example:
 *
 *     const TestSchema = new Schema({ num: Number });
 *     const TestModel = db.model('Test', TestSchema);
 *     TestModel.find({ num: 'not a number' }).error(new Error('woops')).exec(function(error) {
 *       // `error` will be a cast error because `num` failed to cast
 *     });
 *
 * @param {Error|null} err if set, `exec()` will fail fast before sending the query to MongoDB
 * @return {Query} this
 * @api public
 */

Query.prototype.error = function error(err) {
  if (arguments.length === 0) {
    return this._error;
  }

  this._error = err;
  return this;
};

/**
 * ignore
 * @method _unsetCastError
 * @instance
 * @memberOf Query
 * @api private
 */

Query.prototype._unsetCastError = function _unsetCastError() {
  if (this._error != null && !(this._error instanceof CastError)) {
    return;
  }
  return this.error(null);
};

/**
 * Getter/setter around the current mongoose-specific options for this query
 * Below are the current Mongoose-specific options.
 *
 * - `populate`: an array representing what paths will be populated. Should have one entry for each call to [`Query.prototype.populate()`](/docs/api.html#query_Query-populate)
 * - `lean`: if truthy, Mongoose will not [hydrate](/docs/api.html#model_Model-hydrate) any documents that are returned from this query. See [`Query.prototype.lean()`](/docs/api.html#query_Query-lean) for more information.
 * - `strict`: controls how Mongoose handles keys that aren't in the schema for updates. This option is `true` by default, which means Mongoose will silently strip any paths in the update that aren't in the schema. See the [`strict` mode docs](/docs/guide.html#strict) for more information.
 * - `strictQuery`: controls how Mongoose handles keys that aren't in the schema for the query `filter`. This option is `false` by default for backwards compatibility, which means Mongoose will allow `Model.find({ foo: 'bar' })` even if `foo` is not in the schema. See the [`strictQuery` docs](/docs/guide.html#strictQuery) for more information.
 * - `nearSphere`: use `$nearSphere` instead of `near()`. See the [`Query.prototype.nearSphere()` docs](/docs/api.html#query_Query-nearSphere)
 *
 * Mongoose maintains a separate object for internal options because
 * Mongoose sends `Query.prototype.options` to the MongoDB server, and the
 * above options are not relevant for the MongoDB server.
 *
 * @param {Object} options if specified, overwrites the current options
 * @return {Object} the options
 * @api public
 */

Query.prototype.mongooseOptions = function(v) {
  if (arguments.length > 0) {
    this._mongooseOptions = v;
  }
  return this._mongooseOptions;
};

/**
 * ignore
 * @method _castConditions
 * @memberOf Query
 * @api private
 * @instance
 */

Query.prototype._castConditions = function() {
  let sanitizeFilterOpt = undefined;
  if (this.model != null && utils.hasUserDefinedProperty(this.model.db.options, 'sanitizeFilter')) {
    sanitizeFilterOpt = this.model.db.options.sanitizeFilter;
  } else if (this.model != null && utils.hasUserDefinedProperty(this.model.base.options, 'sanitizeFilter')) {
    sanitizeFilterOpt = this.model.base.options.sanitizeFilter;
  } else {
    sanitizeFilterOpt = this._mongooseOptions.sanitizeFilter;
  }

  if (sanitizeFilterOpt) {
    sanitizeFilter(this._conditions);
  }

  try {
    this.cast(this.model);
    this._unsetCastError();
  } catch (err) {
    this.error(err);
  }
};

/*!
 * ignore
 */

function _castArrayFilters(query) {
  try {
    castArrayFilters(query);
  } catch (err) {
    query.error(err);
  }
}

/**
 * Thunk around find()
 *
 * @param {Function} [callback]
 * @return {Query} this
 * @api private
 */
Query.prototype._find = wrapThunk(function(callback) {
  this._castConditions();

  if (this.error() != null) {
    callback(this.error());
    return null;
  }

  callback = _wrapThunkCallback(this, callback);

  this._applyPaths();
  this._fields = this._castFields(this._fields);

  const fields = this._fieldsForExec();
  const mongooseOptions = this._mongooseOptions;
  const _this = this;
  const userProvidedFields = _this._userProvidedFields || {};

  applyGlobalMaxTimeMS(this.options, this.model);
  applyGlobalDiskUse(this.options, this.model);

  // Separate options to pass down to `completeMany()` in case we need to
  // set a session on the document
  const completeManyOptions = Object.assign({}, {
    session: this && this.options && this.options.session || null,
    lean: mongooseOptions.lean || null
  });

  const cb = (err, docs) => {
    if (err) {
      return callback(err);
    }

    if (docs.length === 0) {
      return callback(null, docs);
    }
    if (this.options.explain) {
      return callback(null, docs);
    }
    if (!mongooseOptions.populate) {
      const versionKey = _this.schema.options.versionKey;
      if (mongooseOptions.lean && mongooseOptions.lean.versionKey === false && versionKey) {
        docs.forEach((doc) => {
          if (versionKey in doc) {
            delete doc[versionKey];
          }
        });
      }
      return mongooseOptions.lean ?
      // call _completeManyLean here?
        _completeManyLean(_this.model.schema, docs, null, completeManyOptions, callback) :
        // callback(null, docs) :
        completeMany(_this.model, docs, fields, userProvidedFields, completeManyOptions, callback);
    }

    const pop = helpers.preparePopulationOptionsMQ(_this, mongooseOptions);

    if (mongooseOptions.lean) {
      return _this.model.populate(docs, pop, callback);
    }

    completeMany(_this.model, docs, fields, userProvidedFields, completeManyOptions, (err, docs) => {
      if (err != null) {
        return callback(err);
      }
      _this.model.populate(docs, pop, callback);
    });
  };

  const options = this._optionsForExec();
  options.projection = this._fieldsForExec();
  const filter = this._conditions;

  this._collection.collection.find(filter, options, (err, cursor) => {
    if (err != null) {
      return cb(err);
    }

    if (options.explain) {
      return cursor.explain(cb);
    }
    try {
      return cursor.toArray(cb);
    } catch (err) {
      return cb(err);
    }
  });
});

/**
 * Find all documents that match `selector`. The result will be an array of documents.
 *
 * If there are too many documents in the result to fit in memory, use
 * [`Query.prototype.cursor()`](api.html#query_Query-cursor)
 *
 * #### Example:
 *
 *     // Using async/await
 *     const arr = await Movie.find({ year: { $gte: 1980, $lte: 1989 } });
 *
 *     // Using callbacks
 *     Movie.find({ year: { $gte: 1980, $lte: 1989 } }, function(err, arr) {});
 *
 * @param {Object|ObjectId} [filter] mongodb selector. If not specified, returns all documents.
 * @param {Function} [callback]
 * @return {Query} this
 * @api public
 */

Query.prototype.find = function(conditions, callback) {
  this.op = 'find';

  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = {};
  }

  conditions = utils.toObject(conditions);

  if (mquery.canMerge(conditions)) {
    this.merge(conditions);

    prepareDiscriminatorCriteria(this);
  } else if (conditions != null) {
    this.error(new ObjectParameterError(conditions, 'filter', 'find'));
  }

  // if we don't have a callback, then just return the query object
  if (!callback) {
    return Query.base.find.call(this);
  }

  this.exec(callback);

  return this;
};

/**
 * Merges another Query or conditions object into this one.
 *
 * When a Query is passed, conditions, field selection and options are merged.
 *
 * @param {Query|Object} source
 * @return {Query} this
 */

Query.prototype.merge = function(source) {
  if (!source) {
    return this;
  }

  const opts = { overwrite: true };

  if (source instanceof Query) {
    // if source has a feature, apply it to ourselves

    if (source._conditions) {
      utils.merge(this._conditions, source._conditions, opts);
    }

    if (source._fields) {
      this._fields || (this._fields = {});
      utils.merge(this._fields, source._fields, opts);
    }

    if (source.options) {
      this.options || (this.options = {});
      utils.merge(this.options, source.options, opts);
    }

    if (source._update) {
      this._update || (this._update = {});
      utils.mergeClone(this._update, source._update);
    }

    if (source._distinct) {
      this._distinct = source._distinct;
    }

    utils.merge(this._mongooseOptions, source._mongooseOptions);

    return this;
  }

  // plain object
  utils.merge(this._conditions, source, opts);

  return this;
};

/**
 * Adds a collation to this op (MongoDB 3.4 and up)
 *
 * @param {Object} value
 * @return {Query} this
 * @see MongoDB docs https://docs.mongodb.com/manual/reference/method/cursor.collation/#cursor.collation
 * @api public
 */

Query.prototype.collation = function(value) {
  if (this.options == null) {
    this.options = {};
  }
  this.options.collation = value;
  return this;
};

/**
 * Hydrate a single doc from `findOne()`, `findOneAndUpdate()`, etc.
 *
 * @api private
 */

Query.prototype._completeOne = function(doc, res, callback) {
  if (!doc && !this.options.rawResult) {
    return callback(null, null);
  }

  const model = this.model;
  const projection = utils.clone(this._fields);
  const userProvidedFields = this._userProvidedFields || {};
  // `populate`, `lean`
  const mongooseOptions = this._mongooseOptions;
  // `rawResult`
  const options = this.options;
  if (!options.lean && mongooseOptions.lean) {
    options.lean = mongooseOptions.lean;
  }

  if (options.explain) {
    return callback(null, doc);
  }

  if (!mongooseOptions.populate) {
    const versionKey = this.schema.options.versionKey;
    if (mongooseOptions.lean && mongooseOptions.lean.versionKey === false && versionKey) {
      if (versionKey in doc) {
        delete doc[versionKey];
      }
    }
    return mongooseOptions.lean ?
      _completeOneLean(model.schema, doc, null, res, options, callback) :
      completeOne(model, doc, res, options, projection, userProvidedFields,
        null, callback);
  }

  const pop = helpers.preparePopulationOptionsMQ(this, this._mongooseOptions);
  if (mongooseOptions.lean) {
    return model.populate(doc, pop, (err, doc) => {
      if (err != null) {
        return callback(err);
      }
      _completeOneLean(model.schema, doc, null, res, options, callback);
    });
  }

  completeOne(model, doc, res, options, projection, userProvidedFields, [], (err, doc) => {
    if (err != null) {
      return callback(err);
    }
    model.populate(doc, pop, callback);
  });
};

/**
 * Thunk around findOne()
 *
 * @param {Function} [callback]
 * @see findOne https://docs.mongodb.org/manual/reference/method/db.collection.findOne/
 * @api private
 */

Query.prototype._findOne = wrapThunk(function(callback) {
  this._castConditions();

  if (this.error()) {
    callback(this.error());
    return null;
  }

  this._applyPaths();
  this._fields = this._castFields(this._fields);
  applyGlobalMaxTimeMS(this.options, this.model);
  applyGlobalDiskUse(this.options, this.model);

  // don't pass in the conditions because we already merged them in
  Query.base.findOne.call(this, {}, (err, doc) => {
    if (err) {
      callback(err);
      return null;
    }

    this._completeOne(doc, null, _wrapThunkCallback(this, callback));
  });
});

/**
 * Declares the query a findOne operation. When executed, the first found document is passed to the callback.
 *
 * Passing a `callback` executes the query. The result of the query is a single document.
 *
 * * *Note:* `conditions` is optional, and if `conditions` is null or undefined,
 * mongoose will send an empty `findOne` command to MongoDB, which will return
 * an arbitrary document. If you're querying by `_id`, use `Model.findById()`
 * instead.
 *
 * This function triggers the following middleware.
 *
 * - `findOne()`
 *
 * #### Example:
 *
 *     const query  = Kitten.where({ color: 'white' });
 *     query.findOne(function (err, kitten) {
 *       if (err) return handleError(err);
 *       if (kitten) {
 *         // doc may be null if no document matched
 *       }
 *     });
 *
 * @param {Object} [filter] mongodb selector
 * @param {Object} [projection] optional fields to return
 * @param {Object} [options] see [`setOptions()`](https://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback] optional params are (error, document)
 * @return {Query} this
 * @see findOne https://docs.mongodb.org/manual/reference/method/db.collection.findOne/
 * @see Query.select #query_Query-select
 * @api public
 */

Query.prototype.findOne = function(conditions, projection, options, callback) {
  this.op = 'findOne';
  this._validateOp();

  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = null;
    projection = null;
    options = null;
  } else if (typeof projection === 'function') {
    callback = projection;
    options = null;
    projection = null;
  } else if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  // make sure we don't send in the whole Document to merge()
  conditions = utils.toObject(conditions);

  if (options) {
    this.setOptions(options);
  }

  if (projection) {
    this.select(projection);
  }

  if (mquery.canMerge(conditions)) {
    this.merge(conditions);

    prepareDiscriminatorCriteria(this);
  } else if (conditions != null) {
    this.error(new ObjectParameterError(conditions, 'filter', 'findOne'));
  }

  if (!callback) {
    // already merged in the conditions, don't need to send them in.
    return Query.base.findOne.call(this);
  }

  this.exec(callback);
  return this;
};

/**
 * Thunk around count()
 *
 * @param {Function} [callback]
 * @see count https://docs.mongodb.org/manual/reference/method/db.collection.count/
 * @api private
 */

Query.prototype._count = wrapThunk(function(callback) {
  try {
    this.cast(this.model);
  } catch (err) {
    this.error(err);
  }

  if (this.error()) {
    return callback(this.error());
  }

  applyGlobalMaxTimeMS(this.options, this.model);
  applyGlobalDiskUse(this.options, this.model);

  const conds = this._conditions;
  const options = this._optionsForExec();

  this._collection.count(conds, options, utils.tick(callback));
});

/**
 * Thunk around countDocuments()
 *
 * @param {Function} [callback]
 * @see countDocuments https://mongodb.github.io/node-mongodb-native/4.9/classes/Collection.html#countDocuments
 * @api private
 */

Query.prototype._countDocuments = wrapThunk(function(callback) {
  try {
    this.cast(this.model);
  } catch (err) {
    this.error(err);
  }

  if (this.error()) {
    return callback(this.error());
  }

  applyGlobalMaxTimeMS(this.options, this.model);
  applyGlobalDiskUse(this.options, this.model);

  const conds = this._conditions;
  const options = this._optionsForExec();

  this._collection.collection.countDocuments(conds, options, utils.tick(callback));
});

/**
 * Thunk around estimatedDocumentCount()
 *
 * @param {Function} [callback]
 * @see estimatedDocumentCount https://mongodb.github.io/node-mongodb-native/4.9/classes/Collection.html#estimatedDocumentCount
 * @api private
 */

Query.prototype._estimatedDocumentCount = wrapThunk(function(callback) {
  if (this.error()) {
    return callback(this.error());
  }

  const options = this._optionsForExec();

  this._collection.collection.estimatedDocumentCount(options, utils.tick(callback));
});

/**
 * Specifies this query as a `count` query.
 *
 * This method is deprecated. If you want to count the number of documents in
 * a collection, e.g. `count({})`, use the [`estimatedDocumentCount()` function](/docs/api.html#query_Query-estimatedDocumentCount)
 * instead. Otherwise, use the [`countDocuments()`](/docs/api.html#query_Query-countDocuments) function instead.
 *
 * Passing a `callback` executes the query.
 *
 * This function triggers the following middleware.
 *
 * - `count()`
 *
 * #### Example:
 *
 *     const countQuery = model.where({ 'color': 'black' }).count();
 *
 *     query.count({ color: 'black' }).count(callback)
 *
 *     query.count({ color: 'black' }, callback)
 *
 *     query.where('color', 'black').count(function (err, count) {
 *       if (err) return handleError(err);
 *       console.log('there are %d kittens', count);
 *     })
 *
 * @deprecated
 * @param {Object} [filter] count documents that match this object
 * @param {Function} [callback] optional params are (error, count)
 * @return {Query} this
 * @see count https://docs.mongodb.org/manual/reference/method/db.collection.count/
 * @api public
 */

Query.prototype.count = function(filter, callback) {
  this.op = 'count';
  this._validateOp();
  if (typeof filter === 'function') {
    callback = filter;
    filter = undefined;
  }

  filter = utils.toObject(filter);

  if (mquery.canMerge(filter)) {
    this.merge(filter);
  }

  if (!callback) {
    return this;
  }

  this.exec(callback);

  return this;
};

/**
 * Specifies this query as a `estimatedDocumentCount()` query. Faster than
 * using `countDocuments()` for large collections because
 * `estimatedDocumentCount()` uses collection metadata rather than scanning
 * the entire collection.
 *
 * `estimatedDocumentCount()` does **not** accept a filter. `Model.find({ foo: bar }).estimatedDocumentCount()`
 * is equivalent to `Model.find().estimatedDocumentCount()`
 *
 * This function triggers the following middleware.
 *
 * - `estimatedDocumentCount()`
 *
 * #### Example:
 *
 *     await Model.find().estimatedDocumentCount();
 *
 * @param {Object} [options] passed transparently to the [MongoDB driver](https://mongodb.github.io/node-mongodb-native/4.9/interfaces/EstimatedDocumentCountOptions.html)
 * @param {Function} [callback] optional params are (error, count)
 * @return {Query} this
 * @see estimatedDocumentCount https://mongodb.github.io/node-mongodb-native/4.9/classes/Collection.html#estimatedDocumentCount
 * @api public
 */

Query.prototype.estimatedDocumentCount = function(options, callback) {
  this.op = 'estimatedDocumentCount';
  this._validateOp();
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }

  if (typeof options === 'object' && options != null) {
    this.setOptions(options);
  }

  if (!callback) {
    return this;
  }

  this.exec(callback);

  return this;
};

/**
 * Specifies this query as a `countDocuments()` query. Behaves like `count()`,
 * except it always does a full collection scan when passed an empty filter `{}`.
 *
 * There are also minor differences in how `countDocuments()` handles
 * [`$where` and a couple geospatial operators](https://mongodb.github.io/node-mongodb-native/4.9/classes/Collection.html#countDocuments).
 * versus `count()`.
 *
 * Passing a `callback` executes the query.
 *
 * This function triggers the following middleware.
 *
 * - `countDocuments()`
 *
 * #### Example:
 *
 *     const countQuery = model.where({ 'color': 'black' }).countDocuments();
 *
 *     query.countDocuments({ color: 'black' }).count(callback);
 *
 *     query.countDocuments({ color: 'black' }, callback);
 *
 *     query.where('color', 'black').countDocuments(function(err, count) {
 *       if (err) return handleError(err);
 *       console.log('there are %d kittens', count);
 *     });
 *
 * The `countDocuments()` function is similar to `count()`, but there are a
 * [few operators that `countDocuments()` does not support](https://mongodb.github.io/node-mongodb-native/4.9/classes/Collection.html#countDocuments).
 * Below are the operators that `count()` supports but `countDocuments()` does not,
 * and the suggested replacement:
 *
 * - `$where`: [`$expr`](https://docs.mongodb.com/manual/reference/operator/query/expr/)
 * - `$near`: [`$geoWithin`](https://docs.mongodb.com/manual/reference/operator/query/geoWithin/) with [`$center`](https://docs.mongodb.com/manual/reference/operator/query/center/#op._S_center)
 * - `$nearSphere`: [`$geoWithin`](https://docs.mongodb.com/manual/reference/operator/query/geoWithin/) with [`$centerSphere`](https://docs.mongodb.com/manual/reference/operator/query/centerSphere/#op._S_centerSphere)
 *
 * @param {Object} [filter] mongodb selector
 * @param {Object} [options]
 * @param {Function} [callback] optional params are (error, count)
 * @return {Query} this
 * @see countDocuments https://mongodb.github.io/node-mongodb-native/4.9/classes/Collection.html#countDocuments
 * @api public
 */

Query.prototype.countDocuments = function(conditions, options, callback) {
  this.op = 'countDocuments';
  this._validateOp();
  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = undefined;
    options = undefined;
  }
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }

  conditions = utils.toObject(conditions);

  if (mquery.canMerge(conditions)) {
    this.merge(conditions);
  }

  if (typeof options === 'object' && options != null) {
    this.setOptions(options);
  }

  if (!callback) {
    return this;
  }

  this.exec(callback);

  return this;
};

/**
 * Thunk around distinct()
 *
 * @param {Function} [callback]
 * @see distinct https://docs.mongodb.org/manual/reference/method/db.collection.distinct/
 * @api private
 */

Query.prototype.__distinct = wrapThunk(function __distinct(callback) {
  this._castConditions();

  if (this.error()) {
    callback(this.error());
    return null;
  }

  applyGlobalMaxTimeMS(this.options, this.model);
  applyGlobalDiskUse(this.options, this.model);

  const options = this._optionsForExec();

  // don't pass in the conditions because we already merged them in
  this._collection.collection.
    distinct(this._distinct, this._conditions, options, callback);
});

/**
 * Declares or executes a distinct() operation.
 *
 * Passing a `callback` executes the query.
 *
 * This function does not trigger any middleware.
 *
 * #### Example:
 *
 *     distinct(field, conditions, callback)
 *     distinct(field, conditions)
 *     distinct(field, callback)
 *     distinct(field)
 *     distinct(callback)
 *     distinct()
 *
 * @param {String} [field]
 * @param {Object|Query} [filter]
 * @param {Function} [callback] optional params are (error, arr)
 * @return {Query} this
 * @see distinct https://docs.mongodb.org/manual/reference/method/db.collection.distinct/
 * @api public
 */

Query.prototype.distinct = function(field, conditions, callback) {
  this.op = 'distinct';
  this._validateOp();
  if (!callback) {
    if (typeof conditions === 'function') {
      callback = conditions;
      conditions = undefined;
    } else if (typeof field === 'function') {
      callback = field;
      field = undefined;
      conditions = undefined;
    }
  }

  conditions = utils.toObject(conditions);

  if (mquery.canMerge(conditions)) {
    this.merge(conditions);

    prepareDiscriminatorCriteria(this);
  } else if (conditions != null) {
    this.error(new ObjectParameterError(conditions, 'filter', 'distinct'));
  }

  if (field != null) {
    this._distinct = field;
  }

  if (callback != null) {
    this.exec(callback);
  }

  return this;
};

/**
 * Sets the sort order
 *
 * If an object is passed, values allowed are `asc`, `desc`, `ascending`, `descending`, `1`, and `-1`.
 *
 * If a string is passed, it must be a space delimited list of path names. The
 * sort order of each path is ascending unless the path name is prefixed with `-`
 * which will be treated as descending.
 *
 * #### Example:
 *
 *     // sort by "field" ascending and "test" descending
 *     query.sort({ field: 'asc', test: -1 });
 *
 *     // equivalent
 *     query.sort('field -test');
 *
 * #### Note:
 *
 * Cannot be used with `distinct()`
 *
 * @param {Object|String} arg
 * @return {Query} this
 * @see cursor.sort https://docs.mongodb.org/manual/reference/method/cursor.sort/
 * @api public
 */

Query.prototype.sort = function(arg) {
  if (arguments.length > 1) {
    throw new Error('sort() only takes 1 Argument');
  }

  return Query.base.sort.call(this, arg);
};

/**
 * Declare and/or execute this query as a remove() operation. `remove()` is
 * deprecated, you should use [`deleteOne()`](#query_Query-deleteOne)
 * or [`deleteMany()`](#query_Query-deleteMany) instead.
 *
 * This function does not trigger any middleware
 *
 * #### Example:
 *
 *     Character.remove({ name: /Stark/ }, callback);
 *
 * This function calls the MongoDB driver's [`Collection#remove()` function](https://mongodb.github.io/node-mongodb-native/4.9/classes/Collection.html#remove).
 * The returned [promise](https://mongoosejs.com/docs/queries.html) resolves to an
 * object that contains 3 properties:
 *
 * - `ok`: `1` if no errors occurred
 * - `deletedCount`: the number of documents deleted
 * - `n`: the number of documents deleted. Equal to `deletedCount`.
 *
 * #### Example:
 *
 *     const res = await Character.remove({ name: /Stark/ });
 *     // Number of docs deleted
 *     res.deletedCount;
 *
 * #### Note:
 *
 * Calling `remove()` creates a [Mongoose query](./queries.html), and a query
 * does not execute until you either pass a callback, call [`Query#then()`](#query_Query-then),
 * or call [`Query#exec()`](#query_Query-exec).
 *
 *     // not executed
 *     const query = Character.remove({ name: /Stark/ });
 *
 *     // executed
 *     Character.remove({ name: /Stark/ }, callback);
 *     Character.remove({ name: /Stark/ }).remove(callback);
 *
 *     // executed without a callback
 *     Character.exec();
 *
 * @param {Object|Query} [filter] mongodb selector
 * @param {Function} [callback] optional params are (error, mongooseDeleteResult)
 * @return {Query} this
 * @deprecated
 * @see DeleteResult https://mongodb.github.io/node-mongodb-native/4.9/interfaces/DeleteResult.html
 * @see remove https://mongodb.github.io/node-mongodb-native/4.9/classes/Collection.html#remove
 * @api public
 */

Query.prototype.remove = function(filter, callback) {
  this.op = 'remove';
  if (typeof filter === 'function') {
    callback = filter;
    filter = null;
  }

  filter = utils.toObject(filter);

  if (mquery.canMerge(filter)) {
    this.merge(filter);

    prepareDiscriminatorCriteria(this);
  } else if (filter != null) {
    this.error(new ObjectParameterError(filter, 'filter', 'remove'));
  }

  if (!callback) {
    return Query.base.remove.call(this);
  }

  this.exec(callback);
  return this;
};

/**
 * ignore
 * @param {Function} callback
 * @method _remove
 * @memberOf Query
 * @instance
 * @api private
 */

Query.prototype._remove = wrapThunk(function(callback) {
  this._castConditions();

  if (this.error() != null) {
    callback(this.error());
    return this;
  }

  callback = _wrapThunkCallback(this, callback);

  return Query.base.remove.call(this, callback);
});

/**
 * Declare and/or execute this query as a `deleteOne()` operation. Works like
 * remove, except it deletes at most one document regardless of the `single`
 * option.
 *
 * This function triggers `deleteOne` middleware.
 *
 * #### Example:
 *
 *     await Character.deleteOne({ name: 'Eddard Stark' });
 *
 *     // Using callbacks:
 *     Character.deleteOne({ name: 'Eddard Stark' }, callback);
 *
 * This function calls the MongoDB driver's [`Collection#deleteOne()` function](https://mongodb.github.io/node-mongodb-native/4.9/classes/Collection.html#deleteOne).
 * The returned [promise](https://mongoosejs.com/docs/queries.html) resolves to an
 * object that contains 3 properties:
 *
 * - `ok`: `1` if no errors occurred
 * - `deletedCount`: the number of documents deleted
 * - `n`: the number of documents deleted. Equal to `deletedCount`.
 *
 * #### Example:
 *
 *     const res = await Character.deleteOne({ name: 'Eddard Stark' });
 *     // `1` if MongoDB deleted a doc, `0` if no docs matched the filter `{ name: ... }`
 *     res.deletedCount;
 *
 * @param {Object|Query} [filter] mongodb selector
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback] optional params are (error, mongooseDeleteResult)
 * @return {Query} this
 * @see DeleteResult https://mongodb.github.io/node-mongodb-native/4.9/interfaces/DeleteResult.html
 * @see deleteOne https://mongodb.github.io/node-mongodb-native/4.9/classes/Collection.html#deleteOne
 * @api public
 */

Query.prototype.deleteOne = function(filter, options, callback) {
  this.op = 'deleteOne';
  if (typeof filter === 'function') {
    callback = filter;
    filter = null;
    options = null;
  } else if (typeof options === 'function') {
    callback = options;
    options = null;
  } else {
    this.setOptions(options);
  }

  filter = utils.toObject(filter);

  if (mquery.canMerge(filter)) {
    this.merge(filter);

    prepareDiscriminatorCriteria(this);
  } else if (filter != null) {
    this.error(new ObjectParameterError(filter, 'filter', 'deleteOne'));
  }

  if (!callback) {
    return Query.base.deleteOne.call(this);
  }

  this.exec.call(this, callback);

  return this;
};

/**
 * Internal thunk for `deleteOne()`
 * @param {Function} callback
 * @method _deleteOne
 * @instance
 * @memberOf Query
 * @api private
 */

Query.prototype._deleteOne = wrapThunk(function(callback) {
  this._castConditions();

  if (this.error() != null) {
    callback(this.error());
    return this;
  }

  callback = _wrapThunkCallback(this, callback);

  return Query.base.deleteOne.call(this, callback);
});

/**
 * Declare and/or execute this query as a `deleteMany()` operation. Works like
 * remove, except it deletes _every_ document that matches `filter` in the
 * collection, regardless of the value of `single`.
 *
 * This function triggers `deleteMany` middleware.
 *
 * #### Example:
 *
 *     await Character.deleteMany({ name: /Stark/, age: { $gte: 18 } });
 *
 *     // Using callbacks:
 *     Character.deleteMany({ name: /Stark/, age: { $gte: 18 } }, callback);
 *
 * This function calls the MongoDB driver's [`Collection#deleteMany()` function](https://mongodb.github.io/node-mongodb-native/4.9/classes/Collection.html#deleteMany).
 * The returned [promise](https://mongoosejs.com/docs/queries.html) resolves to an
 * object that contains 3 properties:
 *
 * - `ok`: `1` if no errors occurred
 * - `deletedCount`: the number of documents deleted
 * - `n`: the number of documents deleted. Equal to `deletedCount`.
 *
 * #### Example:
 *
 *     const res = await Character.deleteMany({ name: /Stark/, age: { $gte: 18 } });
 *     // `0` if no docs matched the filter, number of docs deleted otherwise
 *     res.deletedCount;
 *
 * @param {Object|Query} [filter] mongodb selector
 * @param {Object} [options] optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback] optional params are (error, mongooseDeleteResult)
 * @return {Query} this
 * @see DeleteResult https://mongodb.github.io/node-mongodb-native/4.9/interfaces/DeleteResult.html
 * @see deleteMany https://mongodb.github.io/node-mongodb-native/4.9/classes/Collection.html#deleteMany
 * @api public
 */

Query.prototype.deleteMany = function(filter, options, callback) {
  this.op = 'deleteMany';
  if (typeof filter === 'function') {
    callback = filter;
    filter = null;
    options = null;
  } else if (typeof options === 'function') {
    callback = options;
    options = null;
  } else {
    this.setOptions(options);
  }

  filter = utils.toObject(filter);

  if (mquery.canMerge(filter)) {
    this.merge(filter);

    prepareDiscriminatorCriteria(this);
  } else if (filter != null) {
    this.error(new ObjectParameterError(filter, 'filter', 'deleteMany'));
  }

  if (!callback) {
    return Query.base.deleteMany.call(this);
  }

  this.exec.call(this, callback);

  return this;
};

/**
 * Internal thunk around `deleteMany()`
 * @param {Function} callback
 * @method _deleteMany
 * @instance
 * @memberOf Query
 * @api private
 */

Query.prototype._deleteMany = wrapThunk(function(callback) {
  this._castConditions();

  if (this.error() != null) {
    callback(this.error());
    return this;
  }

  callback = _wrapThunkCallback(this, callback);

  return Query.base.deleteMany.call(this, callback);
});

/**
 * hydrates a document
 *
 * @param {Model} model
 * @param {Document} doc
 * @param {Object} res 3rd parameter to callback
 * @param {Object} fields
 * @param {Query} self
 * @param {Array} [pop] array of paths used in population
 * @param {Function} callback
 * @api private
 */

function completeOne(model, doc, res, options, fields, userProvidedFields, pop, callback) {
  if (options.rawResult && doc == null) {
    _init(null);
    return null;
  }

  helpers.createModelAndInit(model, doc, fields, userProvidedFields, options, pop, _init);

  function _init(err, casted) {
    if (err) {
      return immediate(() => callback(err));
    }


    if (options.rawResult) {
      if (doc && casted) {
        if (options.session != null) {
          casted.$session(options.session);
        }
        res.value = casted;
      } else {
        res.value = null;
      }
      return immediate(() => callback(null, res));
    }
    if (options.session != null) {
      casted.$session(options.session);
    }
    immediate(() => callback(null, casted));
  }
}

/**
 * If the model is a discriminator type and not root, then add the key & value to the criteria.
 * @param {Query} query
 * @api private
 */

function prepareDiscriminatorCriteria(query) {
  if (!query || !query.model || !query.model.schema) {
    return;
  }

  const schema = query.model.schema;

  if (schema && schema.discriminatorMapping && !schema.discriminatorMapping.isRoot) {
    query._conditions[schema.discriminatorMapping.key] = schema.discriminatorMapping.value;
  }
}

/**
 * Issues a mongodb [findAndModify](https://www.mongodb.org/display/DOCS/findAndModify+Command) update command.
 *
 * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found
 * document (if any) to the callback. The query executes if
 * `callback` is passed.
 *
 * This function triggers the following middleware.
 *
 * - `findOneAndUpdate()`
 *
 * #### Available options
 *
 * - `new`: bool - if true, return the modified document rather than the original. defaults to false (changed in 4.0)
 * - `upsert`: bool - creates the object if it doesn't exist. defaults to false.
 * - `fields`: {Object|String} - Field selection. Equivalent to `.select(fields).findOneAndUpdate()`
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
 * - `runValidators`: if true, runs [update validators](/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
 * - `setDefaultsOnInsert`: `true` by default. If `setDefaultsOnInsert` and `upsert` are true, mongoose will apply the [defaults](https://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created.
 * - `rawResult`: if true, returns the [raw result from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/4.9/interfaces/ModifyResult.html)
 *
 * #### Callback Signature
 *
 *     function(error, doc) {
 *       // error: any errors that occurred
 *       // doc: the document before updates are applied if `new: false`, or after updates if `new = true`
 *     }
 *
 * #### Example:
 *
 *     query.findOneAndUpdate(conditions, update, options, callback) // executes
 *     query.findOneAndUpdate(conditions, update, options)  // returns Query
 *     query.findOneAndUpdate(conditions, update, callback) // executes
 *     query.findOneAndUpdate(conditions, update)           // returns Query
 *     query.findOneAndUpdate(update, callback)             // returns Query
 *     query.findOneAndUpdate(update)                       // returns Query
 *     query.findOneAndUpdate(callback)                     // executes
 *     query.findOneAndUpdate()                             // returns Query
 *
 * @method findOneAndUpdate
 * @memberOf Query
 * @instance
 * @param {Object|Query} [filter]
 * @param {Object} [doc]
 * @param {Object} [options]
 * @param {Boolean} [options.rawResult] if true, returns the [raw result from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/4.9/interfaces/ModifyResult.html)
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
 * @param {ClientSession} [options.session=null] The session associated with this query. See [transactions docs](/docs/transactions.html).
 * @param {Boolean} [options.multipleCastError] by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
 * @param {Boolean} [options.new=false] By default, `findOneAndUpdate()` returns the document as it was **before** `update` was applied. If you set `new: true`, `findOneAndUpdate()` will instead give you the object after `update` was applied.
 * @param {Object} [options.lean] if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](/docs/api.html#query_Query-lean) and [the Mongoose lean tutorial](/docs/tutorials/lean.html).
 * @param {ClientSession} [options.session=null] The session associated with this query. See [transactions docs](/docs/transactions.html).
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.timestamps=null] If set to `false` and [schema-level timestamps](/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Note that this allows you to overwrite timestamps. Does nothing if schema-level timestamps are not set.
 * @param {Boolean} [options.returnOriginal=null] An alias for the `new` option. `returnOriginal: false` is equivalent to `new: true`.
 * @param {Function} [callback] optional params are (error, doc), _unless_ `rawResult` is used, in which case params are (error, writeOpResult)
 * @see Tutorial /docs/tutorials/findoneandupdate.html
 * @see findAndModify command https://www.mongodb.com/docs/manual/reference/command/findAndModify/
 * @see ModifyResult https://mongodb.github.io/node-mongodb-native/4.9/interfaces/ModifyResult.html
 * @see findOneAndUpdate https://mongodb.github.io/node-mongodb-native/4.9/classes/Collection.html#findOneAndUpdate
 * @return {Query} this
 * @api public
 */

Query.prototype.findOneAndUpdate = function(criteria, doc, options, callback) {
  this.op = 'findOneAndUpdate';
  this._validateOp();
  this._validate();

  switch (arguments.length) {
    case 3:
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      break;
    case 2:
      if (typeof doc === 'function') {
        callback = doc;
        doc = criteria;
        criteria = undefined;
      }
      options = undefined;
      break;
    case 1:
      if (typeof criteria === 'function') {
        callback = criteria;
        criteria = options = doc = undefined;
      } else {
        doc = criteria;
        criteria = options = undefined;
      }
  }

  if (mquery.canMerge(criteria)) {
    this.merge(criteria);
  }

  // apply doc
  if (doc) {
    this._mergeUpdate(doc);
  }

  options = options ? utils.clone(options) : {};

  if (options.projection) {
    this.select(options.projection);
    delete options.projection;
  }
  if (options.fields) {
    this.select(options.fields);
    delete options.fields;
  }

  const returnOriginal = this &&
    this.model &&
    this.model.base &&
    this.model.base.options &&
    this.model.base.options.returnOriginal;
  if (options.new == null && options.returnDocument == null && options.returnOriginal == null && returnOriginal != null) {
    options.returnOriginal = returnOriginal;
  }

  this.setOptions(options);

  if (!callback) {
    return this;
  }

  this.exec(callback);

  return this;
};

/**
 * Thunk around findOneAndUpdate()
 *
 * @param {Function} [callback]
 * @method _findOneAndUpdate
 * @memberOf Query
 * @api private
 */

Query.prototype._findOneAndUpdate = wrapThunk(function(callback) {
  if (this.error() != null) {
    return callback(this.error());
  }

  this._findAndModify('update', callback);
});

/**
 * Issues a mongodb [findAndModify](https://www.mongodb.org/display/DOCS/findAndModify+Command) remove command.
 *
 * Finds a matching document, removes it, passing the found document (if any) to
 * the callback. Executes if `callback` is passed.
 *
 * This function triggers the following middleware.
 *
 * - `findOneAndRemove()`
 *
 * #### Available options
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
 * - `rawResult`: if true, resolves to the [raw result from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/4.9/interfaces/ModifyResult.html)
 *
 * #### Callback Signature
 *
 *     function(error, doc) {
 *       // error: any errors that occurred
 *       // doc: the document before updates are applied if `new: false`, or after updates if `new = true`
 *     }
 *
 * #### Example:
 *
 *     A.where().findOneAndRemove(conditions, options, callback) // executes
 *     A.where().findOneAndRemove(conditions, options)  // return Query
 *     A.where().findOneAndRemove(conditions, callback) // executes
 *     A.where().findOneAndRemove(conditions) // returns Query
 *     A.where().findOneAndRemove(callback)   // executes
 *     A.where().findOneAndRemove()           // returns Query
 *
 * @method findOneAndRemove
 * @memberOf Query
 * @instance
 * @param {Object} [conditions]
 * @param {Object} [options]
 * @param {Boolean} [options.rawResult] if true, returns the [raw result from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/4.9/interfaces/ModifyResult.html)
 * @param {ClientSession} [options.session=null] The session associated with this query. See [transactions docs](/docs/transactions.html).
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
 * @param {Function} [callback] optional params are (error, document)
 * @return {Query} this
 * @see findAndModify command https://www.mongodb.com/docs/manual/reference/command/findAndModify/
 * @api public
 */

Query.prototype.findOneAndRemove = function(conditions, options, callback) {
  this.op = 'findOneAndRemove';
  this._validateOp();
  this._validate();

  switch (arguments.length) {
    case 2:
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      break;
    case 1:
      if (typeof conditions === 'function') {
        callback = conditions;
        conditions = undefined;
        options = undefined;
      }
      break;
  }

  if (mquery.canMerge(conditions)) {
    this.merge(conditions);
  }

  options && this.setOptions(options);

  if (!callback) {
    return this;
  }

  this.exec(callback);

  return this;
};

/**
 * Issues a MongoDB [findOneAndDelete](https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete/) command.
 *
 * Finds a matching document, removes it, and passes the found document (if any)
 * to the callback. Executes if `callback` is passed.
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
 * #### Available options
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
 * - `rawResult`: if true, resolves to the [raw result from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/4.9/interfaces/ModifyResult.html)
 *
 * #### Callback Signature
 *
 *     function(error, doc) {
 *       // error: any errors that occurred
 *       // doc: the document before updates are applied if `new: false`, or after updates if `new = true`
 *     }
 *
 * #### Example:
 *
 *     A.where().findOneAndDelete(conditions, options, callback) // executes
 *     A.where().findOneAndDelete(conditions, options)  // return Query
 *     A.where().findOneAndDelete(conditions, callback) // executes
 *     A.where().findOneAndDelete(conditions) // returns Query
 *     A.where().findOneAndDelete(callback)   // executes
 *     A.where().findOneAndDelete()           // returns Query
 *
 * @method findOneAndDelete
 * @memberOf Query
 * @param {Object} [conditions]
 * @param {Object} [options]
 * @param {Boolean} [options.rawResult] if true, returns the [raw result from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/4.9/interfaces/ModifyResult.html)
 * @param {ClientSession} [options.session=null] The session associated with this query. See [transactions docs](/docs/transactions.html).
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
 * @param {Function} [callback] optional params are (error, document)
 * @return {Query} this
 * @see findAndModify command https://www.mongodb.com/docs/manual/reference/command/findAndModify/
 * @api public
 */

Query.prototype.findOneAndDelete = function(conditions, options, callback) {
  this.op = 'findOneAndDelete';
  this._validateOp();
  this._validate();

  switch (arguments.length) {
    case 2:
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      break;
    case 1:
      if (typeof conditions === 'function') {
        callback = conditions;
        conditions = undefined;
        options = undefined;
      }
      break;
  }

  if (mquery.canMerge(conditions)) {
    this.merge(conditions);
  }

  options && this.setOptions(options);

  if (!callback) {
    return this;
  }

  this.exec(callback);

  return this;
};

/**
 * Thunk around findOneAndDelete()
 *
 * @param {Function} [callback]
 * @return {Query} this
 * @method _findOneAndDelete
 * @memberOf Query
 * @api private
 */
Query.prototype._findOneAndDelete = wrapThunk(function(callback) {
  this._castConditions();

  if (this.error() != null) {
    callback(this.error());
    return null;
  }

  const filter = this._conditions;
  const options = this._optionsForExec();
  let fields = null;

  if (this._fields != null) {
    options.projection = this._castFields(utils.clone(this._fields));
    fields = options.projection;
    if (fields instanceof Error) {
      callback(fields);
      return null;
    }
  }

  this._collection.collection.findOneAndDelete(filter, options, _wrapThunkCallback(this, (err, res) => {
    if (err) {
      return callback(err);
    }

    const doc = res.value;

    return this._completeOne(doc, res, callback);
  }));
});

/**
 * Issues a MongoDB [findOneAndReplace](https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndReplace/) command.
 *
 * Finds a matching document, removes it, and passes the found document (if any)
 * to the callback. Executes if `callback` is passed.
 *
 * This function triggers the following middleware.
 *
 * - `findOneAndReplace()`
 *
 * #### Available options
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
 * - `rawResult`: if true, resolves to the [raw result from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/4.9/interfaces/ModifyResult.html)
 *
 * #### Callback Signature
 *
 *     function(error, doc) {
 *       // error: any errors that occurred
 *       // doc: the document before updates are applied if `new: false`, or after updates if `new = true`
 *     }
 *
 * #### Example:
 *
 *     A.where().findOneAndReplace(filter, replacement, options, callback); // executes
 *     A.where().findOneAndReplace(filter, replacement, options); // return Query
 *     A.where().findOneAndReplace(filter, replacement, callback); // executes
 *     A.where().findOneAndReplace(filter); // returns Query
 *     A.where().findOneAndReplace(callback); // executes
 *     A.where().findOneAndReplace(); // returns Query
 *
 * @method findOneAndReplace
 * @memberOf Query
 * @param {Object} [filter]
 * @param {Object} [replacement]
 * @param {Object} [options]
 * @param {Boolean} [options.rawResult] if true, returns the [raw result from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/4.9/interfaces/ModifyResult.html)
 * @param {ClientSession} [options.session=null] The session associated with this query. See [transactions docs](/docs/transactions.html).
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.new=false] By default, `findOneAndUpdate()` returns the document as it was **before** `update` was applied. If you set `new: true`, `findOneAndUpdate()` will instead give you the object after `update` was applied.
 * @param {Object} [options.lean] if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](/docs/api.html#query_Query-lean) and [the Mongoose lean tutorial](/docs/tutorials/lean.html).
 * @param {ClientSession} [options.session=null] The session associated with this query. See [transactions docs](/docs/transactions.html).
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.timestamps=null] If set to `false` and [schema-level timestamps](/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Note that this allows you to overwrite timestamps. Does nothing if schema-level timestamps are not set.
 * @param {Boolean} [options.returnOriginal=null] An alias for the `new` option. `returnOriginal: false` is equivalent to `new: true`.
 * @param {Function} [callback] optional params are (error, document)
 * @return {Query} this
 * @api public
 */

Query.prototype.findOneAndReplace = function(filter, replacement, options, callback) {
  this.op = 'findOneAndReplace';
  this._validateOp();
  this._validate();

  switch (arguments.length) {
    case 3:
      if (typeof options === 'function') {
        callback = options;
        options = void 0;
      }
      break;
    case 2:
      if (typeof replacement === 'function') {
        callback = replacement;
        replacement = void 0;
      }
      break;
    case 1:
      if (typeof filter === 'function') {
        callback = filter;
        filter = void 0;
        replacement = void 0;
        options = void 0;
      }
      break;
  }

  if (mquery.canMerge(filter)) {
    this.merge(filter);
  }

  if (replacement != null) {
    if (hasDollarKeys(replacement)) {
      throw new Error('The replacement document must not contain atomic operators.');
    }
    this._mergeUpdate(replacement);
  }

  options = options || {};

  const returnOriginal = this &&
  this.model &&
  this.model.base &&
  this.model.base.options &&
  this.model.base.options.returnOriginal;
  if (options.new == null && options.returnDocument == null && options.returnOriginal == null && returnOriginal != null) {
    options.returnOriginal = returnOriginal;
  }
  this.setOptions(options);
  this.setOptions({ overwrite: true });

  if (!callback) {
    return this;
  }

  this.exec(callback);

  return this;
};

/**
 * Thunk around findOneAndReplace()
 *
 * @param {Function} [callback]
 * @return {Query} this
 * @method _findOneAndReplace
 * @instance
 * @memberOf Query
 * @api private
 */
Query.prototype._findOneAndReplace = wrapThunk(function(callback) {
  this._castConditions();
  if (this.error() != null) {
    callback(this.error());
    return null;
  }

  const filter = this._conditions;
  const options = this._optionsForExec();
  convertNewToReturnDocument(options);
  let fields = null;

  this._applyPaths();
  if (this._fields != null) {
    options.projection = this._castFields(utils.clone(this._fields));
    fields = options.projection;
    if (fields instanceof Error) {
      callback(fields);
      return null;
    }
  }

  const runValidators = _getOption(this, 'runValidators', false);
  if (runValidators === false) {
    try {
      this._update = this._castUpdate(this._update, true);
    } catch (err) {
      const validationError = new ValidationError();
      validationError.errors[err.path] = err;
      callback(validationError);
      return null;
    }

    this._collection.collection.findOneAndReplace(filter, this._update || {}, options, _wrapThunkCallback(this, (err, res) => {
      if (err) {
        return callback(err);
      }

      const doc = res.value;

      return this._completeOne(doc, res, callback);
    }));

    return;
  }


  let castedDoc = new this.model(this._update, null, true);
  this._update = castedDoc;
  castedDoc.validate(err => {
    if (err != null) {
      return callback(err);
    }

    if (castedDoc.toBSON) {
      castedDoc = castedDoc.toBSON();
    }

    this._collection.collection.findOneAndReplace(filter, castedDoc, options, _wrapThunkCallback(this, (err, res) => {
      if (err) {
        return callback(err);
      }

      const doc = res.value;

      return this._completeOne(doc, res, callback);
    }));
  });
});

/**
 * Support the `new` option as an alternative to `returnOriginal` for backwards
 * compat.
 * @api private
 */

function convertNewToReturnDocument(options) {
  if ('new' in options) {
    options.returnDocument = options['new'] ? 'after' : 'before';
    delete options['new'];
  }
  if ('returnOriginal' in options) {
    options.returnDocument = options['returnOriginal'] ? 'before' : 'after';
    delete options['returnOriginal'];
  }
  // Temporary since driver 4.0.0-beta does not support `returnDocument`
  if (typeof options.returnDocument === 'string') {
    options.returnOriginal = options.returnDocument === 'before';
  }
}

/**
 * Thunk around findOneAndRemove()
 *
 * @param {Function} [callback]
 * @return {Query} this
 * @method _findOneAndRemove
 * @memberOf Query
 * @instance
 * @api private
 */
Query.prototype._findOneAndRemove = wrapThunk(function(callback) {
  if (this.error() != null) {
    callback(this.error());
    return;
  }

  this._findAndModify('remove', callback);
});

/**
 * Get options from query opts, falling back to the base mongoose object.
 * @param {Query} query
 * @param {Object} option
 * @param {Any} def
 * @api private
 */

function _getOption(query, option, def) {
  const opts = query._optionsForExec(query.model);

  if (option in opts) {
    return opts[option];
  }
  if (option in query.model.base.options) {
    return query.model.base.options[option];
  }
  return def;
}

/**
 * Override mquery.prototype._findAndModify to provide casting etc.
 *
 * @param {String} type either "remove" or "update"
 * @param {Function} callback
 * @method _findAndModify
 * @memberOf Query
 * @instance
 * @api private
 */

Query.prototype._findAndModify = function(type, callback) {
  if (typeof callback !== 'function') {
    throw new Error('Expected callback in _findAndModify');
  }

  const model = this.model;
  const schema = model.schema;
  const _this = this;
  let fields;

  const castedQuery = castQuery(this);
  if (castedQuery instanceof Error) {
    return callback(castedQuery);
  }

  _castArrayFilters(this);

  const opts = this._optionsForExec(model);

  if ('strict' in opts) {
    this._mongooseOptions.strict = opts.strict;
  }

  const isOverwriting = this.options.overwrite && !hasDollarKeys(this._update);
  if (isOverwriting) {
    this._update = new this.model(this._update, null, true);
  }

  if (type === 'remove') {
    opts.remove = true;
  } else {
    if (!('new' in opts) && !('returnOriginal' in opts) && !('returnDocument' in opts)) {
      opts.new = false;
    }
    if (!('upsert' in opts)) {
      opts.upsert = false;
    }
    if (opts.upsert || opts['new']) {
      opts.remove = false;
    }

    if (!isOverwriting) {
      try {
        this._update = this._castUpdate(this._update, opts.overwrite);
      } catch (err) {
        return callback(err);
      }
      const _opts = Object.assign({}, opts, {
        setDefaultsOnInsert: this._mongooseOptions.setDefaultsOnInsert
      });
      this._update = setDefaultsOnInsert(this._conditions, schema, this._update, _opts);
      if (!this._update || Object.keys(this._update).length === 0) {
        if (opts.upsert) {
          // still need to do the upsert to empty doc
          const doc = utils.clone(castedQuery);
          delete doc._id;
          this._update = { $set: doc };
        } else {
          this._executionStack = null;
          this.findOne(callback);
          return this;
        }
      } else if (this._update instanceof Error) {
        return callback(this._update);
      } else {
        // In order to make MongoDB 2.6 happy (see
        // https://jira.mongodb.org/browse/SERVER-12266 and related issues)
        // if we have an actual update document but $set is empty, junk the $set.
        if (this._update.$set && Object.keys(this._update.$set).length === 0) {
          delete this._update.$set;
        }
      }
    }

    if (Array.isArray(opts.arrayFilters)) {
      opts.arrayFilters = removeUnusedArrayFilters(this._update, opts.arrayFilters);
    }
  }

  this._applyPaths();

  if (this._fields) {
    fields = utils.clone(this._fields);
    opts.projection = this._castFields(fields);
    if (opts.projection instanceof Error) {
      return callback(opts.projection);
    }
  }

  if (opts.sort) convertSortToArray(opts);

  const cb = function(err, doc, res) {
    if (err) {
      return callback(err);
    }

    _this._completeOne(doc, res, callback);
  };

  const runValidators = _getOption(this, 'runValidators', false);

  // Bypass mquery
  const collection = _this._collection.collection;
  convertNewToReturnDocument(opts);

  if (type === 'remove') {
    collection.findOneAndDelete(castedQuery, opts, _wrapThunkCallback(_this, function(error, res) {
      return cb(error, res ? res.value : res, res);
    }));

    return this;
  }

  // honors legacy overwrite option for backward compatibility
  const updateMethod = isOverwriting ? 'findOneAndReplace' : 'findOneAndUpdate';

  if (runValidators) {
    this.validate(this._update, opts, isOverwriting, error => {
      if (error) {
        return callback(error);
      }
      if (this._update && this._update.toBSON) {
        this._update = this._update.toBSON();
      }

      collection[updateMethod](castedQuery, this._update, opts, _wrapThunkCallback(_this, function(error, res) {
        return cb(error, res ? res.value : res, res);
      }));
    });
  } else {
    if (this._update && this._update.toBSON) {
      this._update = this._update.toBSON();
    }
    collection[updateMethod](castedQuery, this._update, opts, _wrapThunkCallback(_this, function(error, res) {
      return cb(error, res ? res.value : res, res);
    }));
  }

  return this;
};

/*!
 * ignore
 */

function _completeOneLean(schema, doc, path, res, opts, callback) {
  if (opts.lean && typeof opts.lean.transform === 'function') {
    opts.lean.transform(doc);

    for (let i = 0; i < schema.childSchemas.length; i++) {
      const childPath = path ? path + '.' + schema.childSchemas[i].model.path : schema.childSchemas[i].model.path;
      const _schema = schema.childSchemas[i].schema;
      const obj = mpath.get(childPath, doc);
      if (obj == null) {
        continue;
      }
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          opts.lean.transform(obj[i]);
        }
      } else {
        opts.lean.transform(obj);
      }
      _completeOneLean(_schema, obj, childPath, res, opts);
    }
    if (callback) {
      return callback(null, doc);
    } else {
      return;
    }
  }
  if (opts.rawResult) {
    return callback(null, res);
  }
  return callback(null, doc);
}

/*!
 * ignore
 */

function _completeManyLean(schema, docs, path, opts, callback) {
  if (opts.lean && typeof opts.lean.transform === 'function') {
    for (const doc of docs) {
      opts.lean.transform(doc);
    }

    for (let i = 0; i < schema.childSchemas.length; i++) {
      const childPath = path ? path + '.' + schema.childSchemas[i].model.path : schema.childSchemas[i].model.path;
      const _schema = schema.childSchemas[i].schema;
      let doc = mpath.get(childPath, docs);
      if (doc == null) {
        continue;
      }
      doc = doc.flat();
      for (let i = 0; i < doc.length; i++) {
        opts.lean.transform(doc[i]);
      }
      _completeManyLean(_schema, doc, childPath, opts);
    }
  }

  if (!callback) {
    return;
  }
  return callback(null, docs);
}
/**
 * Override mquery.prototype._mergeUpdate to handle mongoose objects in
 * updates.
 *
 * @param {Object} doc
 * @method _mergeUpdate
 * @memberOf Query
 * @instance
 * @api private
 */

Query.prototype._mergeUpdate = function(doc) {
  if (doc == null || (typeof doc === 'object' && Object.keys(doc).length === 0)) {
    return;
  }

  if (!this._update) {
    this._update = Array.isArray(doc) ? [] : {};
  }
  if (doc instanceof Query) {
    if (Array.isArray(this._update)) {
      throw new Error('Cannot mix array and object updates');
    }
    if (doc._update) {
      utils.mergeClone(this._update, doc._update);
    }
  } else if (Array.isArray(doc)) {
    if (!Array.isArray(this._update)) {
      throw new Error('Cannot mix array and object updates');
    }
    this._update = this._update.concat(doc);
  } else {
    if (Array.isArray(this._update)) {
      throw new Error('Cannot mix array and object updates');
    }
    utils.mergeClone(this._update, doc);
  }
};

/**
 * The mongodb driver 1.3.23 only supports the nested array sort
 * syntax. We must convert it or sorting findAndModify will not work.
 * @param {Object} opts
 * @param {Array|Object} opts.sort
 * @api private
 */

function convertSortToArray(opts) {
  if (Array.isArray(opts.sort)) {
    return;
  }
  if (!utils.isObject(opts.sort)) {
    return;
  }

  const sort = [];

  for (const key in opts.sort) {
    if (utils.object.hasOwnProperty(opts.sort, key)) {
      sort.push([key, opts.sort[key]]);
    }
  }

  opts.sort = sort;
}

/*!
 * ignore
 */

function _updateThunk(op, callback) {
  this._castConditions();

  _castArrayFilters(this);

  if (this.error() != null) {
    callback(this.error());
    return null;
  }

  callback = _wrapThunkCallback(this, callback);

  const castedQuery = this._conditions;
  const options = this._optionsForExec(this.model);

  this._update = utils.clone(this._update, options);
  const isOverwriting = this.options.overwrite && !hasDollarKeys(this._update);
  if (isOverwriting) {
    if (op === 'updateOne' || op === 'updateMany') {
      return callback(new MongooseError('The MongoDB server disallows ' +
        'overwriting documents using `' + op + '`. See: ' +
        'https://mongoosejs.com/docs/deprecations.html#update'));
    }
    this._update = new this.model(this._update, null, true);
  } else {
    try {
      this._update = this._castUpdate(this._update, options.overwrite);
    } catch (err) {
      callback(err);
      return null;
    }

    if (this._update == null || Object.keys(this._update).length === 0) {
      callback(null, { acknowledged: false });
      return null;
    }

    const _opts = Object.assign({}, options, {
      setDefaultsOnInsert: this._mongooseOptions.setDefaultsOnInsert
    });
    this._update = setDefaultsOnInsert(this._conditions, this.model.schema,
      this._update, _opts);
  }

  if (Array.isArray(options.arrayFilters)) {
    options.arrayFilters = removeUnusedArrayFilters(this._update, options.arrayFilters);
  }

  const runValidators = _getOption(this, 'runValidators', false);
  if (runValidators) {
    this.validate(this._update, options, isOverwriting, err => {
      if (err) {
        return callback(err);
      }

      if (this._update.toBSON) {
        this._update = this._update.toBSON();
      }
      this._collection[op](castedQuery, this._update, options, callback);
    });
    return null;
  }

  if (this._update.toBSON) {
    this._update = this._update.toBSON();
  }

  this._collection[op](castedQuery, this._update, options, callback);
  return null;
}

/**
 * Mongoose calls this function internally to validate the query if
 * `runValidators` is set
 *
 * @param {Object} castedDoc the update, after casting
 * @param {Object} options the options from `_optionsForExec()`
 * @param {Boolean} isOverwriting
 * @param {Function} callback
 * @method validate
 * @memberOf Query
 * @instance
 * @api private
 */

Query.prototype.validate = function validate(castedDoc, options, isOverwriting, callback) {
  return promiseOrCallback(callback, cb => {
    try {
      if (isOverwriting) {
        castedDoc.$validate(cb);
      } else {
        updateValidators(this, this.model.schema, castedDoc, options, cb);
      }
    } catch (err) {
      immediate(function() {
        cb(err);
      });
    }
  });
};

/**
 * Internal thunk for .update()
 *
 * @param {Function} callback
 * @see Model.update #model_Model-update
 * @method _execUpdate
 * @memberOf Query
 * @instance
 * @api private
 */
Query.prototype._execUpdate = wrapThunk(function(callback) {
  return _updateThunk.call(this, 'update', callback);
});

/**
 * Internal thunk for .updateMany()
 *
 * @param {Function} callback
 * @see Model.update #model_Model-update
 * @method _updateMany
 * @memberOf Query
 * @instance
 * @api private
 */
Query.prototype._updateMany = wrapThunk(function(callback) {
  return _updateThunk.call(this, 'updateMany', callback);
});

/**
 * Internal thunk for .updateOne()
 *
 * @param {Function} callback
 * @see Model.update #model_Model-update
 * @method _updateOne
 * @memberOf Query
 * @instance
 * @api private
 */
Query.prototype._updateOne = wrapThunk(function(callback) {
  return _updateThunk.call(this, 'updateOne', callback);
});

/**
 * Internal thunk for .replaceOne()
 *
 * @param {Function} callback
 * @see Model.replaceOne #model_Model-replaceOne
 * @method _replaceOne
 * @memberOf Query
 * @instance
 * @api private
 */
Query.prototype._replaceOne = wrapThunk(function(callback) {
  return _updateThunk.call(this, 'replaceOne', callback);
});

/**
 * Declare and/or execute this query as an update() operation.
 *
 * _All paths passed that are not [atomic](https://docs.mongodb.com/manual/tutorial/model-data-for-atomic-operations/#pattern) operations will become `$set` ops._
 *
 * This function triggers the following middleware.
 *
 * - `update()`
 *
 * #### Example:
 *
 *     Model.where({ _id: id }).update({ title: 'words' });
 *
 *     // becomes
 *
 *     Model.where({ _id: id }).update({ $set: { title: 'words' }});
 *
 * #### Valid options:
 *
 *  - `upsert` (boolean) whether to create the doc if it doesn't match (false)
 *  - `multi` (boolean) whether multiple documents should be updated (false)
 *  - `runValidators` (boolean) if true, runs [update validators](/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
 *  - `setDefaultsOnInsert` (boolean) `true` by default. If `setDefaultsOnInsert` and `upsert` are true, mongoose will apply the [defaults](https://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created.
 *  - `strict` (boolean) overrides the `strict` option for this update
 *  - `read`
 *  - `writeConcern`
 *
 * #### Note:
 *
 * Passing an empty object `{}` as the doc will result in a no-op. The update operation will be ignored and the callback executed without sending the command to MongoDB.
 *
 * #### Note:
 *
 * The operation is only executed when a callback is passed. To force execution without a callback, we must first call update() and then execute it by using the `exec()` method.
 *
 * ```javascript
 * const q = Model.where({ _id: id });
 * q.update({ $set: { name: 'bob' }}).update(); // not executed
 *
 * q.update({ $set: { name: 'bob' }}).exec(); // executed
 *
 * // keys that are not [atomic](https://docs.mongodb.com/manual/tutorial/model-data-for-atomic-operations/#pattern) ops become `$set`.
 * // this executes the same command as the previous example.
 * q.update({ name: 'bob' }).exec();
 *
 * // multi updates
 * Model.where()
 *      .update({ name: /^match/ }, { $set: { arr: [] }}, { multi: true }, callback)
 *
 * // more multi updates
 * Model.where()
 *      .setOptions({ multi: true })
 *      .update({ $set: { arr: [] }}, callback)
 *
 * // single update by default
 * Model.where({ email: 'address@example.com' })
 *      .update({ $inc: { counter: 1 }}, callback)
 * ```
 *
 * API summary
 *
 * ```javascript
 * update(filter, doc, options, cb); // executes
 * update(filter, doc, options);
 * update(filter, doc, cb); // executes
 * update(filter, doc);
 * update(doc, cb); // executes
 * update(doc);
 * update(cb); // executes
 * update(true); // executes
 * update();
 * ```
 *
 * @param {Object} [filter]
 * @param {Object} [doc] the update command
 * @param {Object} [options]
 * @param {Boolean} [options.multipleCastError] by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.upsert=false] if true, and no documents found, insert a new document
 * @param {Object} [options.writeConcern=null] sets the [write concern](https://docs.mongodb.com/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](/docs/guide.html#writeConcern)
 * @param {Boolean} [options.timestamps=null] If set to `false` and [schema-level timestamps](/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Does nothing if schema-level timestamps are not set.
 * @param {Function} [callback] params are (error, writeOpResult)
 * @return {Query} this
 * @see Model.update #model_Model-update
 * @see Query docs https://mongoosejs.com/docs/queries.html
 * @see update https://docs.mongodb.org/manual/reference/method/db.collection.update/
 * @see UpdateResult https://mongodb.github.io/node-mongodb-native/4.9/interfaces/UpdateResult.html
 * @see MongoDB docs https://docs.mongodb.com/manual/reference/command/update/#update-command-output
 * @api public
 */

Query.prototype.update = function(conditions, doc, options, callback) {
  if (typeof options === 'function') {
    // .update(conditions, doc, callback)
    callback = options;
    options = null;
  } else if (typeof doc === 'function') {
    // .update(doc, callback);
    callback = doc;
    doc = conditions;
    conditions = {};
    options = null;
  } else if (typeof conditions === 'function') {
    // .update(callback)
    callback = conditions;
    conditions = undefined;
    doc = undefined;
    options = undefined;
  } else if (typeof conditions === 'object' && !doc && !options && !callback) {
    // .update(doc)
    doc = conditions;
    conditions = undefined;
    options = undefined;
    callback = undefined;
  }

  return _update(this, 'update', conditions, doc, options, callback);
};

/**
 * Declare and/or execute this query as an updateMany() operation. Same as
 * `update()`, except MongoDB will update _all_ documents that match
 * `filter` (as opposed to just the first one) regardless of the value of
 * the `multi` option.
 *
 * **Note** updateMany will _not_ fire update middleware. Use `pre('updateMany')`
 * and `post('updateMany')` instead.
 *
 * #### Example:
 *
 *     const res = await Person.updateMany({ name: /Stark$/ }, { isDeleted: true });
 *     res.n; // Number of documents matched
 *     res.nModified; // Number of documents modified
 *
 * This function triggers the following middleware.
 *
 * - `updateMany()`
 *
 * @param {Object} [filter]
 * @param {Object|Array} [update] the update command
 * @param {Object} [options]
 * @param {Boolean} [options.multipleCastError] by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.upsert=false] if true, and no documents found, insert a new document
 * @param {Object} [options.writeConcern=null] sets the [write concern](https://docs.mongodb.com/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](/docs/guide.html#writeConcern)
 * @param {Boolean} [options.timestamps=null] If set to `false` and [schema-level timestamps](/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Does nothing if schema-level timestamps are not set.
 * @param {Function} [callback] params are (error, writeOpResult)
 * @return {Query} this
 * @see Model.update #model_Model-update
 * @see Query docs https://mongoosejs.com/docs/queries.html
 * @see update https://docs.mongodb.org/manual/reference/method/db.collection.update/
 * @see UpdateResult https://mongodb.github.io/node-mongodb-native/4.9/interfaces/UpdateResult.html
 * @see MongoDB docs https://docs.mongodb.com/manual/reference/command/update/#update-command-output
 * @api public
 */

Query.prototype.updateMany = function(conditions, doc, options, callback) {
  if (typeof options === 'function') {
    // .update(conditions, doc, callback)
    callback = options;
    options = null;
  } else if (typeof doc === 'function') {
    // .update(doc, callback);
    callback = doc;
    doc = conditions;
    conditions = {};
    options = null;
  } else if (typeof conditions === 'function') {
    // .update(callback)
    callback = conditions;
    conditions = undefined;
    doc = undefined;
    options = undefined;
  } else if (typeof conditions === 'object' && !doc && !options && !callback) {
    // .update(doc)
    doc = conditions;
    conditions = undefined;
    options = undefined;
    callback = undefined;
  }

  return _update(this, 'updateMany', conditions, doc, options, callback);
};

/**
 * Declare and/or execute this query as an updateOne() operation. Same as
 * `update()`, except it does not support the `multi` option.
 *
 * - MongoDB will update _only_ the first document that matches `filter` regardless of the value of the `multi` option.
 * - Use `replaceOne()` if you want to overwrite an entire document rather than using [atomic](https://docs.mongodb.com/manual/tutorial/model-data-for-atomic-operations/#pattern) operators like `$set`.
 *
 * **Note** updateOne will _not_ fire update middleware. Use `pre('updateOne')`
 * and `post('updateOne')` instead.
 *
 * #### Example:
 *
 *     const res = await Person.updateOne({ name: 'Jean-Luc Picard' }, { ship: 'USS Enterprise' });
 *     res.n; // Number of documents matched
 *     res.nModified; // Number of documents modified
 *
 * This function triggers the following middleware.
 *
 * - `updateOne()`
 *
 * @param {Object} [filter]
 * @param {Object|Array} [update] the update command
 * @param {Object} [options]
 * @param {Boolean} [options.multipleCastError] by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.upsert=false] if true, and no documents found, insert a new document
 * @param {Object} [options.writeConcern=null] sets the [write concern](https://docs.mongodb.com/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](/docs/guide.html#writeConcern)
 * @param {Boolean} [options.timestamps=null] If set to `false` and [schema-level timestamps](/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Note that this allows you to overwrite timestamps. Does nothing if schema-level timestamps are not set.
 * @param {Function} [callback] params are (error, writeOpResult)
 * @return {Query} this
 * @see Model.update #model_Model-update
 * @see Query docs https://mongoosejs.com/docs/queries.html
 * @see update https://docs.mongodb.org/manual/reference/method/db.collection.update/
 * @see UpdateResult https://mongodb.github.io/node-mongodb-native/4.9/interfaces/UpdateResult.html
 * @see MongoDB docs https://docs.mongodb.com/manual/reference/command/update/#update-command-output
 * @api public
 */

Query.prototype.updateOne = function(conditions, doc, options, callback) {
  if (typeof options === 'function') {
    // .update(conditions, doc, callback)
    callback = options;
    options = null;
  } else if (typeof doc === 'function') {
    // .update(doc, callback);
    callback = doc;
    doc = conditions;
    conditions = {};
    options = null;
  } else if (typeof conditions === 'function') {
    // .update(callback)
    callback = conditions;
    conditions = undefined;
    doc = undefined;
    options = undefined;
  } else if (typeof conditions === 'object' && !doc && !options && !callback) {
    // .update(doc)
    doc = conditions;
    conditions = undefined;
    options = undefined;
    callback = undefined;
  }

  return _update(this, 'updateOne', conditions, doc, options, callback);
};

/**
 * Declare and/or execute this query as a replaceOne() operation. Same as
 * `update()`, except MongoDB will replace the existing document and will
 * not accept any [atomic](https://docs.mongodb.com/manual/tutorial/model-data-for-atomic-operations/#pattern) operators (`$set`, etc.)
 *
 * **Note** replaceOne will _not_ fire update middleware. Use `pre('replaceOne')`
 * and `post('replaceOne')` instead.
 *
 * #### Example:
 *
 *     const res = await Person.replaceOne({ _id: 24601 }, { name: 'Jean Valjean' });
 *     res.n; // Number of documents matched
 *     res.nModified; // Number of documents modified
 *
 * This function triggers the following middleware.
 *
 * - `replaceOne()`
 *
 * @param {Object} [filter]
 * @param {Object} [doc] the update command
 * @param {Object} [options]
 * @param {Boolean} [options.multipleCastError] by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.upsert=false] if true, and no documents found, insert a new document
 * @param {Object} [options.writeConcern=null] sets the [write concern](https://docs.mongodb.com/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](/docs/guide.html#writeConcern)
 * @param {Boolean} [options.timestamps=null] If set to `false` and [schema-level timestamps](/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Does nothing if schema-level timestamps are not set.
 * @param {Function} [callback] params are (error, writeOpResult)
 * @return {Query} this
 * @see Model.update #model_Model-update
 * @see Query docs https://mongoosejs.com/docs/queries.html
 * @see update https://docs.mongodb.org/manual/reference/method/db.collection.update/
 * @see UpdateResult https://mongodb.github.io/node-mongodb-native/4.9/interfaces/UpdateResult.html
 * @see MongoDB docs https://docs.mongodb.com/manual/reference/command/update/#update-command-output
 * @api public
 */

Query.prototype.replaceOne = function(conditions, doc, options, callback) {
  if (typeof options === 'function') {
    // .update(conditions, doc, callback)
    callback = options;
    options = null;
  } else if (typeof doc === 'function') {
    // .update(doc, callback);
    callback = doc;
    doc = conditions;
    conditions = {};
    options = null;
  } else if (typeof conditions === 'function') {
    // .update(callback)
    callback = conditions;
    conditions = undefined;
    doc = undefined;
    options = undefined;
  } else if (typeof conditions === 'object' && !doc && !options && !callback) {
    // .update(doc)
    doc = conditions;
    conditions = undefined;
    options = undefined;
    callback = undefined;
  }

  this.setOptions({ overwrite: true });
  return _update(this, 'replaceOne', conditions, doc, options, callback);
};

/**
 * Internal helper for update, updateMany, updateOne, replaceOne
 * @param {Query} query
 * @param {String} op
 * @param {Object} filter
 * @param {Document} [doc]
 * @param {Object} [options]
 * @param {Function} callback
 * @api private
 */

function _update(query, op, filter, doc, options, callback) {
  // make sure we don't send in the whole Document to merge()
  query.op = op;
  query._validateOp();
  filter = utils.toObject(filter);
  doc = doc || {};

  // strict is an option used in the update checking, make sure it gets set
  if (options != null) {
    if ('strict' in options) {
      query._mongooseOptions.strict = options.strict;
    }
  }

  if (!(filter instanceof Query) &&
      filter != null &&
      filter.toString() !== '[object Object]') {
    query.error(new ObjectParameterError(filter, 'filter', op));
  } else {
    query.merge(filter);
  }

  if (utils.isObject(options)) {
    query.setOptions(options);
  }

  query._mergeUpdate(doc);

  // Hooks
  if (callback) {
    query.exec(callback);

    return query;
  }

  return Query.base[op].call(query, filter, void 0, options, callback);
}

/**
 * Runs a function `fn` and treats the return value of `fn` as the new value
 * for the query to resolve to.
 *
 * Any functions you pass to `transform()` will run **after** any post hooks.
 *
 * #### Example:
 *
 *     const res = await MyModel.findOne().transform(res => {
 *       // Sets a `loadedAt` property on the doc that tells you the time the
 *       // document was loaded.
 *       return res == null ?
 *         res :
 *         Object.assign(res, { loadedAt: new Date() });
 *     });
 *
 * @method transform
 * @memberOf Query
 * @instance
 * @param {Function} fn function to run to transform the query result
 * @return {Query} this
 */

Query.prototype.transform = function(fn) {
  this._transforms.push(fn);
  return this;
};

/**
 * Make this query throw an error if no documents match the given `filter`.
 * This is handy for integrating with async/await, because `orFail()` saves you
 * an extra `if` statement to check if no document was found.
 *
 * #### Example:
 *
 *     // Throws if no doc returned
 *     await Model.findOne({ foo: 'bar' }).orFail();
 *
 *     // Throws if no document was updated. Note that `orFail()` will still
 *     // throw if the only document that matches is `{ foo: 'bar', name: 'test' }`,
 *     // because `orFail()` will throw if no document was _updated_, not
 *     // if no document was _found_.
 *     await Model.updateOne({ foo: 'bar' }, { name: 'test' }).orFail();
 *
 *     // Throws "No docs found!" error if no docs match `{ foo: 'bar' }`
 *     await Model.find({ foo: 'bar' }).orFail(new Error('No docs found!'));
 *
 *     // Throws "Not found" error if no document was found
 *     await Model.findOneAndUpdate({ foo: 'bar' }, { name: 'test' }).
 *       orFail(() => Error('Not found'));
 *
 * @method orFail
 * @memberOf Query
 * @instance
 * @param {Function|Error} [err] optional error to throw if no docs match `filter`. If not specified, `orFail()` will throw a `DocumentNotFoundError`
 * @return {Query} this
 */

Query.prototype.orFail = function(err) {
  this.transform(res => {
    switch (this.op) {
      case 'find':
        if (res.length === 0) {
          throw _orFailError(err, this);
        }
        break;
      case 'findOne':
        if (res == null) {
          throw _orFailError(err, this);
        }
        break;
      case 'replaceOne':
      case 'update':
      case 'updateMany':
      case 'updateOne':
        if (res && res.modifiedCount === 0) {
          throw _orFailError(err, this);
        }
        break;
      case 'findOneAndDelete':
      case 'findOneAndRemove':
        if ((res && res.lastErrorObject && res.lastErrorObject.n) === 0) {
          throw _orFailError(err, this);
        }
        break;
      case 'findOneAndUpdate':
      case 'findOneAndReplace':
        if ((res && res.lastErrorObject && res.lastErrorObject.updatedExisting) === false) {
          throw _orFailError(err, this);
        }
        break;
      case 'deleteMany':
      case 'deleteOne':
      case 'remove':
        if (res.deletedCount === 0) {
          throw _orFailError(err, this);
        }
        break;
      default:
        break;
    }

    return res;
  });
  return this;
};

/**
 * Get the error to throw for `orFail()`
 * @param {Error|undefined} err
 * @param {Query} query
 * @api private
 */

function _orFailError(err, query) {
  if (typeof err === 'function') {
    err = err.call(query);
  }

  if (err == null) {
    err = new DocumentNotFoundError(query.getQuery(), query.model.modelName);
  }

  return err;
}

/**
 * Executes the query
 *
 * #### Example:
 *
 *     const promise = query.exec();
 *     const promise = query.exec('update');
 *
 *     query.exec(callback);
 *     query.exec('find', callback);
 *
 * @param {String|Function} [operation]
 * @param {Function} [callback] optional params depend on the function being called
 * @return {Promise}
 * @api public
 */

Query.prototype.exec = function exec(op, callback) {
  const _this = this;
  // Ensure that `exec()` is the first thing that shows up in
  // the stack when cast errors happen.
  const castError = new CastError();

  if (typeof op === 'function') {
    callback = op;
    op = null;
  } else if (typeof op === 'string') {
    this.op = op;
  }

  if (this.op == null) {
    throw new Error('Query must have `op` before executing');
  }
  this._validateOp();

  callback = this.model.$handleCallbackError(callback);

  return promiseOrCallback(callback, (cb) => {
    cb = this.model.$wrapCallback(cb);

    if (!_this.op) {
      cb();
      return;
    }

    this._hooks.execPre('exec', this, [], (error) => {
      if (error != null) {
        return cb(_cleanCastErrorStack(castError, error));
      }
      let thunk = '_' + this.op;
      if (this.op === 'update') {
        thunk = '_execUpdate';
      } else if (this.op === 'distinct') {
        thunk = '__distinct';
      }
      this[thunk].call(this, (error, res) => {
        if (error) {
          return cb(_cleanCastErrorStack(castError, error));
        }

        this._hooks.execPost('exec', this, [], {}, (error) => {
          if (error) {
            return cb(_cleanCastErrorStack(castError, error));
          }

          cb(null, res);
        });
      });
    });
  }, this.model.events);
};

/*!
 * ignore
 */

function _cleanCastErrorStack(castError, error) {
  if (error instanceof CastError) {
    castError.copy(error);
    return castError;
  }

  return error;
}

/*!
 * ignore
 */

function _wrapThunkCallback(query, cb) {
  return function(error, res) {
    if (error != null) {
      return cb(error);
    }

    for (const fn of query._transforms) {
      try {
        res = fn(res);
      } catch (error) {
        return cb(error);
      }
    }

    return cb(null, res);
  };
}

/**
 * Executes the query returning a `Promise` which will be
 * resolved with either the doc(s) or rejected with the error.
 *
 * More about [`then()` in JavaScript](https://masteringjs.io/tutorials/fundamentals/then).
 *
 * @param {Function} [resolve]
 * @param {Function} [reject]
 * @return {Promise}
 * @api public
 */

Query.prototype.then = function(resolve, reject) {
  return this.exec().then(resolve, reject);
};

/**
 * Executes the query returning a `Promise` which will be
 * resolved with either the doc(s) or rejected with the error.
 * Like `.then()`, but only takes a rejection handler.
 *
 * More about [Promise `catch()` in JavaScript](https://masteringjs.io/tutorials/fundamentals/catch).
 *
 * @param {Function} [reject]
 * @return {Promise}
 * @api public
 */

Query.prototype.catch = function(reject) {
  return this.exec().then(null, reject);
};

/**
 * Add pre [middleware](/docs/middleware.html) to this query instance. Doesn't affect
 * other queries.
 *
 * #### Example:
 *
 *     const q1 = Question.find({ answer: 42 });
 *     q1.pre(function middleware() {
 *       console.log(this.getFilter());
 *     });
 *     await q1.exec(); // Prints "{ answer: 42 }"
 *
 *     // Doesn't print anything, because `middleware()` is only
 *     // registered on `q1`.
 *     await Question.find({ answer: 42 });
 *
 * @param {Function} fn
 * @return {Promise}
 * @api public
 */

Query.prototype.pre = function(fn) {
  this._hooks.pre('exec', fn);
  return this;
};

/**
 * Add post [middleware](/docs/middleware.html) to this query instance. Doesn't affect
 * other queries.
 *
 * #### Example:
 *
 *     const q1 = Question.find({ answer: 42 });
 *     q1.post(function middleware() {
 *       console.log(this.getFilter());
 *     });
 *     await q1.exec(); // Prints "{ answer: 42 }"
 *
 *     // Doesn't print anything, because `middleware()` is only
 *     // registered on `q1`.
 *     await Question.find({ answer: 42 });
 *
 * @param {Function} fn
 * @return {Promise}
 * @api public
 */

Query.prototype.post = function(fn) {
  this._hooks.post('exec', fn);
  return this;
};

/**
 * Casts obj for an update command.
 *
 * @param {Object} obj
 * @param {Boolean} overwrite
 * @return {Object} obj after casting its values
 * @method _castUpdate
 * @memberOf Query
 * @instance
 * @api private
 */

Query.prototype._castUpdate = function _castUpdate(obj, overwrite) {
  let schema = this.schema;

  const discriminatorKey = schema.options.discriminatorKey;
  const baseSchema = schema._baseSchema ? schema._baseSchema : schema;
  if (this._mongooseOptions.overwriteDiscriminatorKey &&
      obj[discriminatorKey] != null &&
      baseSchema.discriminators) {
    const _schema = baseSchema.discriminators[obj[discriminatorKey]];
    if (_schema != null) {
      schema = _schema;
    }
  }

  let upsert;
  if ('upsert' in this.options) {
    upsert = this.options.upsert;
  }

  const filter = this._conditions;
  if (schema != null &&
      utils.hasUserDefinedProperty(filter, schema.options.discriminatorKey) &&
      typeof filter[schema.options.discriminatorKey] !== 'object' &&
      schema.discriminators != null) {
    const discriminatorValue = filter[schema.options.discriminatorKey];
    const byValue = getDiscriminatorByValue(this.model.discriminators, discriminatorValue);
    schema = schema.discriminators[discriminatorValue] ||
      (byValue && byValue.schema) ||
      schema;
  }

  return castUpdate(schema, obj, {
    overwrite: overwrite,
    strict: this._mongooseOptions.strict,
    upsert: upsert,
    arrayFilters: this.options.arrayFilters,
    overwriteDiscriminatorKey: this._mongooseOptions.overwriteDiscriminatorKey
  }, this, this._conditions);
};

/**
 * castQuery
 * @api private
 */

function castQuery(query) {
  try {
    return query.cast(query.model);
  } catch (err) {
    return err;
  }
}

/**
 * Specifies paths which should be populated with other documents.
 *
 * #### Example:
 *
 *     let book = await Book.findOne().populate('authors');
 *     book.title; // 'Node.js in Action'
 *     book.authors[0].name; // 'TJ Holowaychuk'
 *     book.authors[1].name; // 'Nathan Rajlich'
 *
 *     let books = await Book.find().populate({
 *       path: 'authors',
 *       // `match` and `sort` apply to the Author model,
 *       // not the Book model. These options do not affect
 *       // which documents are in `books`, just the order and
 *       // contents of each book document's `authors`.
 *       match: { name: new RegExp('.*h.*', 'i') },
 *       sort: { name: -1 }
 *     });
 *     books[0].title; // 'Node.js in Action'
 *     // Each book's `authors` are sorted by name, descending.
 *     books[0].authors[0].name; // 'TJ Holowaychuk'
 *     books[0].authors[1].name; // 'Marc Harter'
 *
 *     books[1].title; // 'Professional AngularJS'
 *     // Empty array, no authors' name has the letter 'h'
 *     books[1].authors; // []
 *
 * Paths are populated after the query executes and a response is received. A
 * separate query is then executed for each path specified for population. After
 * a response for each query has also been returned, the results are passed to
 * the callback.
 *
 * @param {Object|String|String[]} path either the path(s) to populate or an object specifying all parameters
 * @param {Object|String} [select] Field selection for the population query
 * @param {Model} [model] The model you wish to use for population. If not specified, populate will look up the model by the name in the Schema's `ref` field.
 * @param {Object} [match] Conditions for the population query
 * @param {Object} [options] Options for the population query (sort, etc)
 * @param {String} [options.path=null] The path to populate.
 * @param {boolean} [options.retainNullValues=false] by default, Mongoose removes null and undefined values from populated arrays. Use this option to make `populate()` retain `null` and `undefined` array entries.
 * @param {boolean} [options.getters=false] if true, Mongoose will call any getters defined on the `localField`. By default, Mongoose gets the raw value of `localField`. For example, you would need to set this option to `true` if you wanted to [add a `lowercase` getter to your `localField`](/docs/schematypes.html#schematype-options).
 * @param {boolean} [options.clone=false] When you do `BlogPost.find().populate('author')`, blog posts with the same author will share 1 copy of an `author` doc. Enable this option to make Mongoose clone populated docs before assigning them.
 * @param {Object|Function} [options.match=null] Add an additional filter to the populate query. Can be a filter object containing [MongoDB query syntax](https://docs.mongodb.com/manual/tutorial/query-documents/), or a function that returns a filter object.
 * @param {Function} [options.transform=null] Function that Mongoose will call on every populated document that allows you to transform the populated document.
 * @param {Object} [options.options=null] Additional options like `limit` and `lean`.
 * @see population /docs/populate
 * @see Query#select #query_Query-select
 * @see Model.populate #model_Model-populate
 * @return {Query} this
 * @api public
 */

Query.prototype.populate = function() {
  // Bail when given no truthy arguments
  if (!Array.from(arguments).some(Boolean)) {
    return this;
  }

  const res = utils.populate.apply(null, arguments);

  // Propagate readConcern and readPreference and lean from parent query,
  // unless one already specified
  if (this.options != null) {
    const readConcern = this.options.readConcern;
    const readPref = this.options.readPreference;

    for (const populateOptions of res) {
      if (readConcern != null && (populateOptions && populateOptions.options && populateOptions.options.readConcern) == null) {
        populateOptions.options = populateOptions.options || {};
        populateOptions.options.readConcern = readConcern;
      }
      if (readPref != null && (populateOptions && populateOptions.options && populateOptions.options.readPreference) == null) {
        populateOptions.options = populateOptions.options || {};
        populateOptions.options.readPreference = readPref;
      }
    }
  }

  const opts = this._mongooseOptions;

  if (opts.lean != null) {
    const lean = opts.lean;
    for (const populateOptions of res) {
      if ((populateOptions && populateOptions.options && populateOptions.options.lean) == null) {
        populateOptions.options = populateOptions.options || {};
        populateOptions.options.lean = lean;
      }
    }
  }

  if (!utils.isObject(opts.populate)) {
    opts.populate = {};
  }

  const pop = opts.populate;

  for (const populateOptions of res) {
    const path = populateOptions.path;
    if (pop[path] && pop[path].populate && populateOptions.populate) {
      populateOptions.populate = pop[path].populate.concat(populateOptions.populate);
    }

    pop[populateOptions.path] = populateOptions;
  }
  return this;
};

/**
 * Gets a list of paths to be populated by this query
 *
 * #### Example:
 *
 *      bookSchema.pre('findOne', function() {
 *        let keys = this.getPopulatedPaths(); // ['author']
 *      });
 *      ...
 *      Book.findOne({}).populate('author');
 *
 * #### Example:
 *
 *      // Deep populate
 *      const q = L1.find().populate({
 *        path: 'level2',
 *        populate: { path: 'level3' }
 *      });
 *      q.getPopulatedPaths(); // ['level2', 'level2.level3']
 *
 * @return {Array} an array of strings representing populated paths
 * @api public
 */

Query.prototype.getPopulatedPaths = function getPopulatedPaths() {
  const obj = this._mongooseOptions.populate || {};
  const ret = Object.keys(obj);
  for (const path of Object.keys(obj)) {
    const pop = obj[path];
    if (!Array.isArray(pop.populate)) {
      continue;
    }
    _getPopulatedPaths(ret, pop.populate, path + '.');
  }
  return ret;
};

/*!
 * ignore
 */

function _getPopulatedPaths(list, arr, prefix) {
  for (const pop of arr) {
    list.push(prefix + pop.path);
    if (!Array.isArray(pop.populate)) {
      continue;
    }
    _getPopulatedPaths(list, pop.populate, prefix + pop.path + '.');
  }
}

/**
 * Casts this query to the schema of `model`
 *
 * #### Note:
 *
 * If `obj` is present, it is cast instead of this query.
 *
 * @param {Model} [model] the model to cast to. If not set, defaults to `this.model`
 * @param {Object} [obj]
 * @return {Object}
 * @api public
 */

Query.prototype.cast = function(model, obj) {
  obj || (obj = this._conditions);

  model = model || this.model;
  const discriminatorKey = model.schema.options.discriminatorKey;
  if (obj != null &&
      obj.hasOwnProperty(discriminatorKey)) {
    model = getDiscriminatorByValue(model.discriminators, obj[discriminatorKey]) || model;
  }

  const opts = { upsert: this.options && this.options.upsert };
  if (this.options) {
    if ('strict' in this.options) {
      opts.strict = this.options.strict;
      opts.strictQuery = opts.strict;
    }
    if ('strictQuery' in this.options) {
      opts.strictQuery = this.options.strictQuery;
    }
  }

  try {
    return cast(model.schema, obj, opts, this);
  } catch (err) {
    // CastError, assign model
    if (typeof err.setModel === 'function') {
      err.setModel(model);
    }
    throw err;
  }
};

/**
 * Casts selected field arguments for field selection with mongo 2.2
 *
 *     query.select({ ids: { $elemMatch: { $in: [hexString] }})
 *
 * @param {Object} fields
 * @see https://github.com/Automattic/mongoose/issues/1091
 * @see https://docs.mongodb.org/manual/reference/projection/elemMatch/
 * @api private
 */

Query.prototype._castFields = function _castFields(fields) {
  let selected,
      elemMatchKeys,
      keys,
      key,
      out,
      i;

  if (fields) {
    keys = Object.keys(fields);
    elemMatchKeys = [];
    i = keys.length;

    // collect $elemMatch args
    while (i--) {
      key = keys[i];
      if (fields[key].$elemMatch) {
        selected || (selected = {});
        selected[key] = fields[key];
        elemMatchKeys.push(key);
      }
    }
  }

  if (selected) {
    // they passed $elemMatch, cast em
    try {
      out = this.cast(this.model, selected);
    } catch (err) {
      return err;
    }

    // apply the casted field args
    i = elemMatchKeys.length;
    while (i--) {
      key = elemMatchKeys[i];
      fields[key] = out[key];
    }
  }

  return fields;
};

/**
 * Applies schematype selected options to this query.
 * @api private
 */

Query.prototype._applyPaths = function applyPaths() {
  this._fields = this._fields || {};
  helpers.applyPaths(this._fields, this.model.schema);

  let _selectPopulatedPaths = true;

  if ('selectPopulatedPaths' in this.model.base.options) {
    _selectPopulatedPaths = this.model.base.options.selectPopulatedPaths;
  }
  if ('selectPopulatedPaths' in this.model.schema.options) {
    _selectPopulatedPaths = this.model.schema.options.selectPopulatedPaths;
  }

  if (_selectPopulatedPaths) {
    selectPopulatedFields(this._fields, this._userProvidedFields, this._mongooseOptions.populate);
  }
};

/**
 * Returns a wrapper around a [mongodb driver cursor](https://mongodb.github.io/node-mongodb-native/4.9/classes/FindCursor.html).
 * A QueryCursor exposes a Streams3 interface, as well as a `.next()` function.
 *
 * The `.cursor()` function triggers pre find hooks, but **not** post find hooks.
 *
 * #### Example:
 *
 *     // There are 2 ways to use a cursor. First, as a stream:
 *     Thing.
 *       find({ name: /^hello/ }).
 *       cursor().
 *       on('data', function(doc) { console.log(doc); }).
 *       on('end', function() { console.log('Done!'); });
 *
 *     // Or you can use `.next()` to manually get the next doc in the stream.
 *     // `.next()` returns a promise, so you can use promises or callbacks.
 *     const cursor = Thing.find({ name: /^hello/ }).cursor();
 *     cursor.next(function(error, doc) {
 *       console.log(doc);
 *     });
 *
 *     // Because `.next()` returns a promise, you can use co
 *     // to easily iterate through all documents without loading them
 *     // all into memory.
 *     const cursor = Thing.find({ name: /^hello/ }).cursor();
 *     for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
 *       console.log(doc);
 *     }
 *
 * #### Valid options
 *
 *   - `transform`: optional function which accepts a mongoose document. The return value of the function will be emitted on `data` and returned by `.next()`.
 *
 * @return {QueryCursor}
 * @param {Object} [options]
 * @see QueryCursor /docs/api/querycursor
 * @api public
 */

Query.prototype.cursor = function cursor(opts) {
  this._applyPaths();
  this._fields = this._castFields(this._fields);
  this.setOptions({ projection: this._fieldsForExec() });
  if (opts) {
    this.setOptions(opts);
  }

  const options = Object.assign({}, this._optionsForExec(), {
    projection: this.projection()
  });
  try {
    this.cast(this.model);
  } catch (err) {
    return (new QueryCursor(this, options))._markError(err);
  }

  return new QueryCursor(this, options);
};

// the rest of these are basically to support older Mongoose syntax with mquery

/**
 * _DEPRECATED_ Alias of `maxScan`
 *
 * @deprecated
 * @see maxScan #query_Query-maxScan
 * @method maxscan
 * @memberOf Query
 * @instance
 */

Query.prototype.maxscan = Query.base.maxScan;

/**
 * Sets the tailable option (for use with capped collections).
 *
 * #### Example:
 *
 *     query.tailable(); // true
 *     query.tailable(true);
 *     query.tailable(false);
 *
 *     // Set both `tailable` and `awaitData` options
 *     query.tailable({ awaitData: true });
 *
 * #### Note:
 *
 * Cannot be used with `distinct()`
 *
 * @param {Boolean} bool defaults to true
 * @param {Object} [opts] options to set
 * @param {Boolean} [opts.awaitData] false by default. Set to true to keep the cursor open even if there's no data.
 * @param {Number} [opts.maxAwaitTimeMS] the maximum amount of time for the server to wait on new documents to satisfy a tailable cursor query. Requires `tailable` and `awaitData` to be true
 * @see tailable https://docs.mongodb.org/manual/tutorial/create-tailable-cursor/
 * @api public
 */

Query.prototype.tailable = function(val, opts) {
  // we need to support the tailable({ awaitData : true }) as well as the
  // tailable(true, {awaitData :true}) syntax that mquery does not support
  if (val != null && typeof val.constructor === 'function' && val.constructor.name === 'Object') {
    opts = val;
    val = true;
  }

  if (val === undefined) {
    val = true;
  }

  if (opts && typeof opts === 'object') {
    for (const key of Object.keys(opts)) {
      if (key === 'awaitData' || key === 'awaitdata') { // backwards compat, see gh-10875
        // For backwards compatibility
        this.options['awaitData'] = !!opts[key];
      } else {
        this.options[key] = opts[key];
      }
    }
  }

  return Query.base.tailable.call(this, val);
};

/**
 * Declares an intersects query for `geometry()`.
 *
 * #### Example:
 *
 *     query.where('path').intersects().geometry({
 *       type: 'LineString',
 *       coordinates: [[180.0, 11.0], [180, 9.0]]
 *     });
 *
 *     query.where('path').intersects({
 *       type: 'LineString',
 *       coordinates: [[180.0, 11.0], [180, 9.0]]
 *     });
 *
 * #### Note:
 *
 * **MUST** be used after `where()`.
 *
 * #### Note:
 *
 * In Mongoose 3.7, `intersects` changed from a getter to a function. If you need the old syntax, use [this](https://github.com/ebensing/mongoose-within).
 *
 * @method intersects
 * @memberOf Query
 * @instance
 * @param {Object} [arg]
 * @return {Query} this
 * @see $geometry https://docs.mongodb.org/manual/reference/operator/geometry/
 * @see geoIntersects https://docs.mongodb.org/manual/reference/operator/geoIntersects/
 * @api public
 */

/**
 * Specifies a `$geometry` condition
 *
 * #### Example:
 *
 *     const polyA = [[[ 10, 20 ], [ 10, 40 ], [ 30, 40 ], [ 30, 20 ]]]
 *     query.where('loc').within().geometry({ type: 'Polygon', coordinates: polyA })
 *
 *     // or
 *     const polyB = [[ 0, 0 ], [ 1, 1 ]]
 *     query.where('loc').within().geometry({ type: 'LineString', coordinates: polyB })
 *
 *     // or
 *     const polyC = [ 0, 0 ]
 *     query.where('loc').within().geometry({ type: 'Point', coordinates: polyC })
 *
 *     // or
 *     query.where('loc').intersects().geometry({ type: 'Point', coordinates: polyC })
 *
 * The argument is assigned to the most recent path passed to `where()`.
 *
 * #### Note:
 *
 * `geometry()` **must** come after either `intersects()` or `within()`.
 *
 * The `object` argument must contain `type` and `coordinates` properties.
 * - type {String}
 * - coordinates {Array}
 *
 * @method geometry
 * @memberOf Query
 * @instance
 * @param {Object} object Must contain a `type` property which is a String and a `coordinates` property which is an Array. See the examples.
 * @return {Query} this
 * @see $geometry https://docs.mongodb.org/manual/reference/operator/geometry/
 * @see Geospatial Support Enhancements https://www.mongodb.com/docs/manual/release-notes/2.4/#geospatial-support-enhancements
 * @see MongoDB Geospatial Indexing https://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

/**
 * Specifies a `$near` or `$nearSphere` condition
 *
 * These operators return documents sorted by distance.
 *
 * #### Example:
 *
 *     query.where('loc').near({ center: [10, 10] });
 *     query.where('loc').near({ center: [10, 10], maxDistance: 5 });
 *     query.where('loc').near({ center: [10, 10], maxDistance: 5, spherical: true });
 *     query.near('loc', { center: [10, 10], maxDistance: 5 });
 *
 * @method near
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Object} val
 * @return {Query} this
 * @see $near https://docs.mongodb.org/manual/reference/operator/near/
 * @see $nearSphere https://docs.mongodb.org/manual/reference/operator/nearSphere/
 * @see $maxDistance https://docs.mongodb.org/manual/reference/operator/maxDistance/
 * @see MongoDB Geospatial Indexing https://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

/**
 * Overwriting mquery is needed to support a couple different near() forms found in older
 * versions of mongoose
 * near([1,1])
 * near(1,1)
 * near(field, [1,2])
 * near(field, 1, 2)
 * In addition to all of the normal forms supported by mquery
 *
 * @method near
 * @memberOf Query
 * @instance
 * @api private
 */

Query.prototype.near = function() {
  const params = [];
  const sphere = this._mongooseOptions.nearSphere;

  // TODO refactor

  if (arguments.length === 1) {
    if (Array.isArray(arguments[0])) {
      params.push({ center: arguments[0], spherical: sphere });
    } else if (typeof arguments[0] === 'string') {
      // just passing a path
      params.push(arguments[0]);
    } else if (utils.isObject(arguments[0])) {
      if (typeof arguments[0].spherical !== 'boolean') {
        arguments[0].spherical = sphere;
      }
      params.push(arguments[0]);
    } else {
      throw new TypeError('invalid argument');
    }
  } else if (arguments.length === 2) {
    if (typeof arguments[0] === 'number' && typeof arguments[1] === 'number') {
      params.push({ center: [arguments[0], arguments[1]], spherical: sphere });
    } else if (typeof arguments[0] === 'string' && Array.isArray(arguments[1])) {
      params.push(arguments[0]);
      params.push({ center: arguments[1], spherical: sphere });
    } else if (typeof arguments[0] === 'string' && utils.isObject(arguments[1])) {
      params.push(arguments[0]);
      if (typeof arguments[1].spherical !== 'boolean') {
        arguments[1].spherical = sphere;
      }
      params.push(arguments[1]);
    } else {
      throw new TypeError('invalid argument');
    }
  } else if (arguments.length === 3) {
    if (typeof arguments[0] === 'string' && typeof arguments[1] === 'number'
        && typeof arguments[2] === 'number') {
      params.push(arguments[0]);
      params.push({ center: [arguments[1], arguments[2]], spherical: sphere });
    } else {
      throw new TypeError('invalid argument');
    }
  } else {
    throw new TypeError('invalid argument');
  }

  return Query.base.near.apply(this, params);
};

/**
 * _DEPRECATED_ Specifies a `$nearSphere` condition
 *
 * #### Example:
 *
 *     query.where('loc').nearSphere({ center: [10, 10], maxDistance: 5 });
 *
 * **Deprecated.** Use `query.near()` instead with the `spherical` option set to `true`.
 *
 * #### Example:
 *
 *     query.where('loc').near({ center: [10, 10], spherical: true });
 *
 * @deprecated
 * @see near() #query_Query-near
 * @see $near https://docs.mongodb.org/manual/reference/operator/near/
 * @see $nearSphere https://docs.mongodb.org/manual/reference/operator/nearSphere/
 * @see $maxDistance https://docs.mongodb.org/manual/reference/operator/maxDistance/
 */

Query.prototype.nearSphere = function() {
  this._mongooseOptions.nearSphere = true;
  this.near.apply(this, arguments);
  return this;
};

/**
 * Returns an asyncIterator for use with [`for/await/of` loops](https://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js)
 * This function *only* works for `find()` queries.
 * You do not need to call this function explicitly, the JavaScript runtime
 * will call it for you.
 *
 * #### Example:
 *
 *     for await (const doc of Model.aggregate([{ $sort: { name: 1 } }])) {
 *       console.log(doc.name);
 *     }
 *
 * Node.js 10.x supports async iterators natively without any flags. You can
 * enable async iterators in Node.js 8.x using the [`--harmony_async_iteration` flag](https://github.com/tc39/proposal-async-iteration/issues/117#issuecomment-346695187).
 *
 * **Note:** This function is not if `Symbol.asyncIterator` is undefined. If
 * `Symbol.asyncIterator` is undefined, that means your Node.js version does not
 * support async iterators.
 *
 * @method Symbol.asyncIterator
 * @memberOf Query
 * @instance
 * @api public
 */

if (Symbol.asyncIterator != null) {
  Query.prototype[Symbol.asyncIterator] = function() {
    return this.cursor().transformNull()._transformForAsyncIterator();
  };
}

/**
 * Specifies a `$polygon` condition
 *
 * #### Example:
 *
 *     query.where('loc').within().polygon([10, 20], [13, 25], [7, 15]);
 *     query.polygon('loc', [10, 20], [13, 25], [7, 15]);
 *
 * @method polygon
 * @memberOf Query
 * @instance
 * @param {String|Array} [path]
 * @param {Array|Object} [coordinatePairs...]
 * @return {Query} this
 * @see $polygon https://docs.mongodb.org/manual/reference/operator/polygon/
 * @see MongoDB Geospatial Indexing https://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

/**
 * Specifies a `$box` condition
 *
 * #### Example:
 *
 *     const lowerLeft = [40.73083, -73.99756]
 *     const upperRight= [40.741404,  -73.988135]
 *
 *     query.where('loc').within().box(lowerLeft, upperRight)
 *     query.box({ ll : lowerLeft, ur : upperRight })
 *
 * @method box
 * @memberOf Query
 * @instance
 * @see $box https://docs.mongodb.org/manual/reference/operator/box/
 * @see within() Query#within #query_Query-within
 * @see MongoDB Geospatial Indexing https://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @param {Object|Array<Number>} val1 Lower Left Coordinates OR a object of lower-left(ll) and upper-right(ur) Coordinates
 * @param {Array<Number>} [val2] Upper Right Coordinates
 * @return {Query} this
 * @api public
 */

/**
 * this is needed to support the mongoose syntax of:
 * box(field, { ll : [x,y], ur : [x2,y2] })
 * box({ ll : [x,y], ur : [x2,y2] })
 *
 * @method box
 * @memberOf Query
 * @instance
 * @api private
 */

Query.prototype.box = function(ll, ur) {
  if (!Array.isArray(ll) && utils.isObject(ll)) {
    ur = ll.ur;
    ll = ll.ll;
  }
  return Query.base.box.call(this, ll, ur);
};

/**
 * Specifies a `$center` or `$centerSphere` condition.
 *
 * #### Example:
 *
 *     const area = { center: [50, 50], radius: 10, unique: true }
 *     query.where('loc').within().circle(area)
 *     // alternatively
 *     query.circle('loc', area);
 *
 *     // spherical calculations
 *     const area = { center: [50, 50], radius: 10, unique: true, spherical: true }
 *     query.where('loc').within().circle(area)
 *     // alternatively
 *     query.circle('loc', area);
 *
 * @method circle
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Object} area
 * @return {Query} this
 * @see $center https://docs.mongodb.org/manual/reference/operator/center/
 * @see $centerSphere https://docs.mongodb.org/manual/reference/operator/centerSphere/
 * @see $geoWithin https://docs.mongodb.org/manual/reference/operator/geoWithin/
 * @see MongoDB Geospatial Indexing https://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

/**
 * _DEPRECATED_ Alias for [circle](#query_Query-circle)
 *
 * **Deprecated.** Use [circle](#query_Query-circle) instead.
 *
 * @deprecated
 * @method center
 * @memberOf Query
 * @instance
 * @api public
 */

Query.prototype.center = Query.base.circle;

/**
 * _DEPRECATED_ Specifies a `$centerSphere` condition
 *
 * **Deprecated.** Use [circle](#query_Query-circle) instead.
 *
 * #### Example:
 *
 *     const area = { center: [50, 50], radius: 10 };
 *     query.where('loc').within().centerSphere(area);
 *
 * @deprecated
 * @param {String} [path]
 * @param {Object} val
 * @return {Query} this
 * @see MongoDB Geospatial Indexing https://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @see $centerSphere https://docs.mongodb.org/manual/reference/operator/centerSphere/
 * @api public
 */

Query.prototype.centerSphere = function() {
  if (arguments[0] != null && typeof arguments[0].constructor === 'function' && arguments[0].constructor.name === 'Object') {
    arguments[0].spherical = true;
  }

  if (arguments[1] != null && typeof arguments[1].constructor === 'function' && arguments[1].constructor.name === 'Object') {
    arguments[1].spherical = true;
  }

  Query.base.circle.apply(this, arguments);
};

/**
 * Determines if field selection has been made.
 *
 * @method selected
 * @memberOf Query
 * @instance
 * @return {Boolean}
 * @api public
 */

/**
 * Determines if inclusive field selection has been made.
 *
 *     query.selectedInclusively(); // false
 *     query.select('name');
 *     query.selectedInclusively(); // true
 *
 * @method selectedInclusively
 * @memberOf Query
 * @instance
 * @return {Boolean}
 * @api public
 */

Query.prototype.selectedInclusively = function selectedInclusively() {
  return isInclusive(this._fields);
};

/**
 * Determines if exclusive field selection has been made.
 *
 *     query.selectedExclusively(); // false
 *     query.select('-name');
 *     query.selectedExclusively(); // true
 *     query.selectedInclusively(); // false
 *
 * @method selectedExclusively
 * @memberOf Query
 * @instance
 * @return {Boolean}
 * @api public
 */

Query.prototype.selectedExclusively = function selectedExclusively() {
  return isExclusive(this._fields);
};

/**
 * The model this query is associated with.
 *
 * #### Example:
 *
 *     const q = MyModel.find();
 *     q.model === MyModel; // true
 *
 * @api public
 * @property model
 * @memberOf Query
 * @instance
 */

Query.prototype.model;

/*!
 * Export
 */

module.exports = Query;
