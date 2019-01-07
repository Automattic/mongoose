'use strict';

/*!
 * Module dependencies.
 */

const CastError = require('./error/cast');
const Kareem = require('kareem');
const ObjectParameterError = require('./error/objectParameter');
const QueryCursor = require('./cursor/QueryCursor');
const ReadPreference = require('./driver').get().ReadPreference;
const applyWriteConcern = require('./helpers/schema/applyWriteConcern');
const cast = require('./cast');
const castUpdate = require('./helpers/query/castUpdate');
const completeMany = require('./helpers/query/completeMany');
const get = require('./helpers/get');
const hasDollarKeys = require('./helpers/query/hasDollarKeys');
const helpers = require('./queryhelpers');
const isInclusive = require('./helpers/projection/isInclusive');
const mquery = require('mquery');
const selectPopulatedFields = require('./helpers/query/selectPopulatedFields');
const setDefaultsOnInsert = require('./helpers/setDefaultsOnInsert');
const slice = require('sliced');
const updateValidators = require('./helpers/updateValidators');
const util = require('util');
const utils = require('./utils');
const wrapThunk = require('./helpers/query/wrapThunk');

/**
 * Query constructor used for building queries. You do not need
 * to instantiate a `Query` directly. Instead use Model functions like
 * [`Model.find()`](/docs/api.html#find_find).
 *
 * ####Example:
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
  this._executionCount = 0;

  // this is the case where we have a CustomQuery, we need to check if we got
  // options passed in, and if we did, merge them in
  const keys = Object.keys(options);
  for (let i = 0; i < keys.length; ++i) {
    const k = keys[i];
    this._mongooseOptions[k] = options[k];
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
  mquery.call(this, this.mongooseCollection, options);

  if (conditions) {
    this.find(conditions);
  }

  this.options = this.options || {};

  // For gh-6880. mquery still needs to support `fields` by default for old
  // versions of MongoDB
  this.$useProjection = true;

  const collation = get(this, 'schema.options.collation', null);
  if (collation != null) {
    this.options.collation = collation;
  }
}

/*!
 * inherit mquery
 */

Query.prototype = new mquery;
Query.prototype.constructor = Query;
Query.base = mquery.prototype;

/**
 * Flag to opt out of using `$geoWithin`.
 *
 *     mongoose.Query.use$geoWithin = false;
 *
 * MongoDB 2.4 deprecated the use of `$within`, replacing it with `$geoWithin`. Mongoose uses `$geoWithin` by default (which is 100% backward compatible with $within). If you are running an older version of MongoDB, set this flag to `false` so your `within()` queries continue to work.
 *
 * @see http://docs.mongodb.org/manual/reference/operator/geoWithin/
 * @default true
 * @property use$geoWithin
 * @memberOf Query
 * @receiver Query
 * @api public
 */

Query.use$geoWithin = mquery.use$geoWithin;

/**
 * Converts this query to a customized, reusable query constructor with all arguments and options retained.
 *
 * ####Example
 *
 *     // Create a query for adventure movies and read from the primary
 *     // node in the replica-set unless it is down, in which case we'll
 *     // read from a secondary node.
 *     var query = Movie.find({ tags: 'adventure' }).read('primaryPreferred');
 *
 *     // create a custom Query constructor based off these settings
 *     var Adventure = query.toConstructor();
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
 * New in 3.7.3
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

  p.setOptions(this.options);

  p.op = this.op;
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
 * Specifies a javascript function or expression to pass to MongoDBs query system.
 *
 * ####Example
 *
 *     query.$where('this.comments.length === 10 || this.name.length === 5')
 *
 *     // or
 *
 *     query.$where(function () {
 *       return this.comments.length === 10 || this.name.length === 5;
 *     })
 *
 * ####NOTE:
 *
 * Only use `$where` when you have a condition that cannot be met using other MongoDB operators like `$lt`.
 * **Be sure to read about all of [its caveats](http://docs.mongodb.org/manual/reference/operator/where/) before using.**
 *
 * @see $where http://docs.mongodb.org/manual/reference/operator/where/
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
 * ####Example
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
      val = slice(arguments);
    } else {
      path = arguments[0];
      val = arguments[1];
    }
  } else if (arguments.length === 3) {
    path = arguments[0];
    val = slice(arguments, 1);
  }

  const p = {};
  p[path] = { $slice: val };
  this.select(p);

  return this;
};


/**
 * Specifies the complementary comparison value for paths specified with `where()`
 *
 * ####Example
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
 * ####Example
 *
 *     query.or([{ color: 'red' }, { status: 'emergency' }])
 *
 * @see $or http://docs.mongodb.org/manual/reference/operator/or/
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
 * ####Example
 *
 *     query.nor([{ color: 'green' }, { status: 'ok' }])
 *
 * @see $nor http://docs.mongodb.org/manual/reference/operator/nor/
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
 * ####Example
 *
 *     query.and([{ color: 'green' }, { status: 'ok' }])
 *
 * @method and
 * @memberOf Query
 * @instance
 * @see $and http://docs.mongodb.org/manual/reference/operator/and/
 * @param {Array} array array of conditions
 * @return {Query} this
 * @api public
 */

/**
 * Specifies a $gt query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * ####Example
 *
 *     Thing.find().where('age').gt(21)
 *
 *     // or
 *     Thing.find().gt('age', 21)
 *
 * @method gt
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @see $gt http://docs.mongodb.org/manual/reference/operator/gt/
 * @api public
 */

/**
 * Specifies a $gte query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method gte
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @see $gte http://docs.mongodb.org/manual/reference/operator/gte/
 * @api public
 */

/**
 * Specifies a $lt query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method lt
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @see $lt http://docs.mongodb.org/manual/reference/operator/lt/
 * @api public
 */

/**
 * Specifies a $lte query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method lte
 * @see $lte http://docs.mongodb.org/manual/reference/operator/lte/
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $ne query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @see $ne http://docs.mongodb.org/manual/reference/operator/ne/
 * @method ne
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies an $in query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @see $in http://docs.mongodb.org/manual/reference/operator/in/
 * @method in
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies an $nin query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @see $nin http://docs.mongodb.org/manual/reference/operator/nin/
 * @method nin
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies an $all query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @see $all http://docs.mongodb.org/manual/reference/operator/all/
 * @method all
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $size query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * ####Example
 *
 *     MyModel.where('tags').size(0).exec(function (err, docs) {
 *       if (err) return handleError(err);
 *
 *       assert(Array.isArray(docs));
 *       console.log('documents with 0 tags', docs);
 *     })
 *
 * @see $size http://docs.mongodb.org/manual/reference/operator/size/
 * @method size
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $regex query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @see $regex http://docs.mongodb.org/manual/reference/operator/regex/
 * @method regex
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {String|RegExp} val
 * @api public
 */

/**
 * Specifies a $maxDistance query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @see $maxDistance http://docs.mongodb.org/manual/reference/operator/maxDistance/
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
 * ####Example
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
 * @see $mod http://docs.mongodb.org/manual/reference/operator/mod/
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
    val = slice(arguments);
    path = this._path;
  } else if (arguments.length === 3) {
    val = slice(arguments, 1);
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
 * ####Example
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
 * @param {Number} val
 * @return {Query} this
 * @see $exists http://docs.mongodb.org/manual/reference/operator/exists/
 * @api public
 */

/**
 * Specifies an `$elemMatch` condition
 *
 * ####Example
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
 * @param {Object|Function} criteria
 * @return {Query} this
 * @see $elemMatch http://docs.mongodb.org/manual/reference/operator/elemMatch/
 * @api public
 */

/**
 * Defines a `$within` or `$geoWithin` argument for geo-spatial queries.
 *
 * ####Example
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
 * ####NOTE:
 *
 * As of Mongoose 3.7, `$geoWithin` is always used for queries. To change this behavior, see [Query.use$geoWithin](#query_Query-use%2524geoWithin).
 *
 * ####NOTE:
 *
 * In Mongoose 3.7, `within` changed from a getter to a function. If you need the old syntax, use [this](https://github.com/ebensing/mongoose-within).
 *
 * @method within
 * @see $polygon http://docs.mongodb.org/manual/reference/operator/polygon/
 * @see $box http://docs.mongodb.org/manual/reference/operator/box/
 * @see $geometry http://docs.mongodb.org/manual/reference/operator/geometry/
 * @see $center http://docs.mongodb.org/manual/reference/operator/center/
 * @see $centerSphere http://docs.mongodb.org/manual/reference/operator/centerSphere/
 * @memberOf Query
 * @instance
 * @return {Query} this
 * @api public
 */

/**
 * Specifies a $slice projection for an array.
 *
 * ####Example
 *
 *     query.slice('comments', 5)
 *     query.slice('comments', -5)
 *     query.slice('comments', [10, 5])
 *     query.where('comments').slice(5)
 *     query.where('comments').slice([-10, 5])
 *
 * @method slice
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Number} val number/range of elements to slice
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/Retrieving+a+Subset+of+Fields#RetrievingaSubsetofFields-RetrievingaSubrangeofArrayElements
 * @see $slice http://docs.mongodb.org/manual/reference/projection/slice/#prj._S_slice
 * @api public
 */

/**
 * Specifies the maximum number of documents the query will return.
 *
 * ####Example
 *
 *     query.limit(20)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method limit
 * @memberOf Query
 * @instance
 * @param {Number} val
 * @api public
 */

/**
 * Specifies the number of documents to skip.
 *
 * ####Example
 *
 *     query.skip(100).limit(20)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method skip
 * @memberOf Query
 * @instance
 * @param {Number} val
 * @see cursor.skip http://docs.mongodb.org/manual/reference/method/cursor.skip/
 * @api public
 */

/**
 * Specifies the maxScan option.
 *
 * ####Example
 *
 *     query.maxScan(100)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method maxScan
 * @memberOf Query
 * @instance
 * @param {Number} val
 * @see maxScan http://docs.mongodb.org/manual/reference/operator/maxScan/
 * @api public
 */

/**
 * Specifies the batchSize option.
 *
 * ####Example
 *
 *     query.batchSize(100)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method batchSize
 * @memberOf Query
 * @instance
 * @param {Number} val
 * @see batchSize http://docs.mongodb.org/manual/reference/method/cursor.batchSize/
 * @api public
 */

/**
 * Specifies the `comment` option.
 *
 * ####Example
 *
 *     query.comment('login query')
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method comment
 * @memberOf Query
 * @instance
 * @param {Number} val
 * @see comment http://docs.mongodb.org/manual/reference/operator/comment/
 * @api public
 */

/**
 * Specifies this query as a `snapshot` query.
 *
 * ####Example
 *
 *     query.snapshot() // true
 *     query.snapshot(true)
 *     query.snapshot(false)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method snapshot
 * @memberOf Query
 * @instance
 * @see snapshot http://docs.mongodb.org/manual/reference/operator/snapshot/
 * @return {Query} this
 * @api public
 */

/**
 * Sets query hints.
 *
 * ####Example
 *
 *     query.hint({ indexA: 1, indexB: -1})
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @method hint
 * @memberOf Query
 * @instance
 * @param {Object} val a hint object
 * @return {Query} this
 * @see $hint http://docs.mongodb.org/manual/reference/operator/hint/
 * @api public
 */

/**
 * Specifies which document fields to include or exclude (also known as the query "projection")
 *
 * When using string syntax, prefixing a path with `-` will flag that path as excluded. When a path does not have the `-` prefix, it is included. Lastly, if a path is prefixed with `+`, it forces inclusion of the path, which is useful for paths excluded at the [schema level](/docs/api.html#schematype_SchemaType-select).
 *
 * A projection _must_ be either inclusive or exclusive. In other words, you must
 * either list the fields to include (which excludes all others), or list the fields
 * to exclude (which implies all other fields are included). The [`_id` field is the only exception because MongoDB includes it by default](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/#suppress-id-field).
 *
 * ####Example
 *
 *     // include a and b, exclude other fields
 *     query.select('a b');
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
 *
 * @method select
 * @memberOf Query
 * @instance
 * @param {Object|String} arg
 * @return {Query} this
 * @see SchemaType
 * @api public
 */

Query.prototype.select = function select() {
  let arg = arguments[0];
  if (!arg) return this;
  let i;
  let len;

  if (arguments.length !== 1) {
    throw new Error('Invalid select: select only takes 1 argument');
  }

  this._validate('select');

  const fields = this._fields || (this._fields = {});
  const userProvidedFields = this._userProvidedFields || (this._userProvidedFields = {});
  const type = typeof arg;

  if (('string' == type || Object.prototype.toString.call(arg) === '[object Arguments]') &&
    'number' == typeof arg.length || Array.isArray(arg)) {
    if ('string' == type)
      arg = arg.split(/\s+/);

    for (i = 0, len = arg.length; i < len; ++i) {
      let field = arg[i];
      if (!field) continue;
      const include = '-' == field[0] ? 0 : 1;
      if (include === 0) field = field.substring(1);
      fields[field] = include;
      userProvidedFields[field] = include;
    }
    return this;
  }

  if (utils.isObject(arg)) {
    const keys = Object.keys(arg);
    for (i = 0; i < keys.length; ++i) {
      fields[keys[i]] = arg[keys[i]];
      userProvidedFields[keys[i]] = arg[keys[i]];
    }
    return this;
  }

  throw new TypeError('Invalid select() argument. Must be string or object.');
};

/**
 * _DEPRECATED_ Sets the slaveOk option.
 *
 * **Deprecated** in MongoDB 2.2 in favor of [read preferences](#query_Query-read).
 *
 * ####Example:
 *
 *     query.slaveOk() // true
 *     query.slaveOk(true)
 *     query.slaveOk(false)
 *
 * @method slaveOk
 * @memberOf Query
 * @instance
 * @deprecated use read() preferences instead if on mongodb >= 2.2
 * @param {Boolean} v defaults to true
 * @see mongodb http://docs.mongodb.org/manual/applications/replication/#read-preference
 * @see slaveOk http://docs.mongodb.org/manual/reference/method/rs.slaveOk/
 * @see read() #query_Query-read
 * @return {Query} this
 * @api public
 */

/**
 * Determines the MongoDB nodes from which to read.
 *
 * ####Preferences:
 *
 *     primary - (default) Read from primary only. Operations will produce an error if primary is unavailable. Cannot be combined with tags.
 *     secondary            Read from secondary if available, otherwise error.
 *     primaryPreferred     Read from primary if available, otherwise a secondary.
 *     secondaryPreferred   Read from a secondary if available, otherwise read from the primary.
 *     nearest              All operations read from among the nearest candidates, but unlike other modes, this option will include both the primary and all secondaries in the random selection.
 *
 * Aliases
 *
 *     p   primary
 *     pp  primaryPreferred
 *     s   secondary
 *     sp  secondaryPreferred
 *     n   nearest
 *
 * ####Example:
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
 * Read more about how to use read preferrences [here](http://docs.mongodb.org/manual/applications/replication/#read-preference) and [here](http://mongodb.github.com/node-mongodb-native/driver-articles/anintroductionto1_1and2_2.html#read-preferences).
 *
 * @method read
 * @memberOf Query
 * @instance
 * @param {String} pref one of the listed preference options or aliases
 * @param {Array} [tags] optional tags for this query
 * @see mongodb http://docs.mongodb.org/manual/applications/replication/#read-preference
 * @see driver http://mongodb.github.com/node-mongodb-native/driver-articles/anintroductionto1_1and2_2.html#read-preferences
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
 * Sets the [MongoDB session](https://docs.mongodb.com/manual/reference/server-sessions/)
 * associated with this query. Sessions are how you mark a query as part of a
 * [transaction](/docs/transactions.html).
 *
 * Calling `session(null)` removes the session from this query.
 *
 * ####Example:
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
 * ####Example:
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
  this.options.w = val;
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
 * ####Example:
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
  this.options.j = val;
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
 * ####Example:
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
  this.options.wtimeout = ms;
  return this;
};

/**
 * Sets the readConcern option for the query.
 *
 * ####Example:
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
 * ####Read Concern Level:
 *
 *     local         MongoDB 3.2+ The query returns from the instance with no guarantee guarantee that the data has been written to a majority of the replica set members (i.e. may be rolled back).
 *     available     MongoDB 3.6+ The query returns from the instance with no guarantee guarantee that the data has been written to a majority of the replica set members (i.e. may be rolled back).
 *     majority      MongoDB 3.2+ The query returns the data that has been acknowledged by a majority of the replica set members. The documents returned by the read operation are durable, even in the event of failure.
 *     linearizable  MongoDB 3.4+ The query returns data that reflects all successful majority-acknowledged writes that completed prior to the start of the read operation. The query may wait for concurrently executing writes to propagate to a majority of replica set members before returning results.
 *     snapshot      MongoDB 4.0+ Only available for operations within multi-document transactions. Upon transaction commit with write concern "majority", the transaction operations are guaranteed to have read from a snapshot of majority-committed data.
 *
 * Aliases
 *
 *     l   local
 *     a   available
 *     m   majority
 *     lz  linearizable
 *     s   snapshot
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
 * Merges another Query or conditions object into this one.
 *
 * When a Query is passed, conditions, field selection and options are merged.
 *
 * New in 3.7.0
 *
 * @method merge
 * @memberOf Query
 * @instance
 * @param {Query|Object} source
 * @return {Query} this
 */

/**
 * Gets query options.
 *
 * ####Example:
 *
 *     var query = new Query();
 *     query.limit(10);
 *     query.setOptions({ maxTimeMS: 1000 })
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
 * ####Options:
 *
 * The following options are only for `find()`:
 *
 * - [tailable](http://www.mongodb.org/display/DOCS/Tailable+Cursors)
 * - [sort](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsort(\)%7D%7D)
 * - [limit](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Blimit%28%29%7D%7D)
 * - [skip](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bskip%28%29%7D%7D)
 * - [maxscan](https://docs.mongodb.org/v3.2/reference/operator/meta/maxScan/#metaOp._S_maxScan)
 * - [batchSize](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7BbatchSize%28%29%7D%7D)
 * - [comment](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24comment)
 * - [snapshot](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsnapshot%28%29%7D%7D)
 * - [readPreference](http://docs.mongodb.org/manual/applications/replication/#read-preference)
 * - [hint](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24hint)
 *
 * The following options are only for write operations: `update()`, `updateOne()`, `updateMany()`, `replaceOne()`, `findOneAndUpdate()`, and `findByIdAndUpdate()`:
 *
 * - [upsert](https://docs.mongodb.com/manual/reference/method/db.collection.update/)
 * - [writeConcern](https://docs.mongodb.com/manual/reference/method/db.collection.update/)
 * - [timestamps](https://mongoosejs.com/docs/guide.html#timestamps): If `timestamps` is set in the schema, set this option to `false` to skip timestamps for that particular update. Has no effect if `timestamps` is not enabled in the schema options.
 *
 * The following options are only for `find()`, `findOne()`, `findById()`, `findOneAndUpdate()`, and `findByIdAndUpdate()`:
 *
 * - [lean](./api.html#query_Query-lean)
 *
 * The following options are only for all operations **except** `update()`, `updateOne()`, `updateMany()`, `remove()`, `deleteOne()`, and `deleteMany()`:
 *
 * - [maxTimeMS](https://docs.mongodb.com/manual/reference/operator/meta/maxTimeMS/)
 *
 * The following options are for all operations:
 *
 * - [collation](https://docs.mongodb.com/manual/reference/collation/)
 * - [session](https://docs.mongodb.com/manual/reference/server-sessions/)
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

  if (Array.isArray(options.populate)) {
    const populate = options.populate;
    delete options.populate;
    const _numPopulate = populate.length;
    for (let i = 0; i < _numPopulate; ++i) {
      this.populate(populate[i]);
    }
  }

  if ('useFindAndModify' in options) {
    this._mongooseOptions.useFindAndModify = options.useFindAndModify;
    delete options.useFindAndModify;
  }
  if ('omitUndefined' in options) {
    this._mongooseOptions.omitUndefined = options.omitUndefined;
    delete options.omitUndefined;
  }

  return Query.base.setOptions.call(this, options);
};

/**
 * Sets the [`explain` option](https://docs.mongodb.com/manual/reference/method/cursor.explain/),
 * which makes this query return detailed execution stats instead of the actual
 * query result. This method is useful for determining what index your queries
 * use.
 *
 * Calling `query.explain(v)` is equivalent to `query.setOption({ explain: v })`
 *
 * ####Example:
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
    return this;
  }
  this.options.explain = verbose;
  return this;
};

/**
 * Sets the [maxTimeMS](https://docs.mongodb.com/manual/reference/method/cursor.maxTimeMS/)
 * option. This will tell the MongoDB server to abort if the query or write op
 * has been running for more than `ms` milliseconds.
 *
 * Calling `query.maxTimeMS(v)` is equivalent to `query.setOption({ maxTimeMS: v })`
 *
 * ####Example:
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
 * Returns the current query conditions as a JSON object.
 *
 * ####Example:
 *
 *     var query = new Query();
 *     query.find({ a: 1 }).where('b').gt(2);
 *     query.getQuery(); // { a: 1, b: { $gt: 2 } }
 *
 * @return {Object} current query conditions
 * @api public
 */

Query.prototype.getQuery = function() {
  return this._conditions;
};

/**
 * Sets the query conditions to the provided JSON object.
 *
 * ####Example:
 *
 *     var query = new Query();
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
 * ####Example:
 *
 *     var query = new Query();
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
 * ####Example:
 *
 *     var query = new Query();
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
 * @receiver Query
 */

Query.prototype._fieldsForExec = function() {
  return utils.clone(this._fields);
};


/**
 * Return an update document with corrected $set operations.
 *
 * @method _updateForExec
 * @api private
 * @receiver Query
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
 * @method _ensurePath
 * @param {String} method
 * @api private
 * @receiver Query
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

  const safe = get(model, 'schema.options.safe', null);
  if (!('safe' in options) && safe != null) {
    setSafe(options, safe);
  }

  // Apply schema-level `writeConcern` option
  applyWriteConcern(model.schema, options);

  const readPreference = get(model, 'schema.options.read');
  if (!('readPreference' in options) && readPreference) {
    options.readPreference = readPreference;
  }

  if (options.upsert !== void 0) {
    options.upsert = !!options.upsert;
  }

  return options;
};

/*!
 * ignore
 */

const safeDeprecationWarning = 'Mongoose: the `safe` option is deprecated. ' +
  'Use write concerns instead: http://bit.ly/mongoose-w';

const setSafe = util.deprecate(function setSafe(options, safe) {
  options.safe = safe;
}, safeDeprecationWarning);

/**
 * Sets the lean option.
 *
 * Documents returned from queries with the `lean` option enabled are plain javascript objects, not [MongooseDocuments](#document-js). They have no `save` method, getters/setters or other Mongoose magic applied.
 *
 * ####Example:
 *
 *     new Query().lean() // true
 *     new Query().lean(true)
 *     new Query().lean(false)
 *
 *     Model.find().lean().exec(function (err, docs) {
 *       docs[0] instanceof mongoose.Document // false
 *     });
 *
 * This is a [great](https://groups.google.com/forum/#!topic/mongoose-orm/u2_DzDydcnA/discussion) option in high-performance read-only scenarios, especially when combined with [stream](#query_Query-stream).
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
 * ####Example:
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
  this._update.$set = this._update.$set || {};
  this._update.$set[path] = val;
  return this;
};

/**
 * Gets/sets the error flag on this query. If this flag is not null or
 * undefined, the `exec()` promise will reject without executing.
 *
 * ####Example:
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
 * ####Example:
 *     var TestSchema = new Schema({ num: Number });
 *     var TestModel = db.model('Test', TestSchema);
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

/*!
 * ignore
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
 * - `lean`: if truthy, Mongoose will not [hydrate](/docs/api.html#model_Model.hydrate) any documents that are returned from this query. See [`Query.prototype.lean()`](/docs/api.html#query_Query-lean) for more information.
 * - `strict`: controls how Mongoose handles keys that aren't in the schema for updates. This option is `true` by default, which means Mongoose will silently strip any paths in the update that aren't in the schema. See the [`strict` mode docs](/docs/guide.html#strict) for more information.
 * - `strictQuery`: controls how Mongoose handles keys that aren't in the schema for the query `filter`. This option is `false` by default for backwards compatibility, which means Mongoose will allow `Model.find({ foo: 'bar' })` even if `foo` is not in the schema. See the [`strictQuery` docs](/docs/guide.html#strictQuery) for more information.
 * - `useFindAndModify`: used to work around the [`findAndModify()` deprecation warning](/docs/deprecations.html#-findandmodify-)
 * - `omitUndefined`: delete any properties whose value is `undefined` when casting an update. In other words, if this is set, Mongoose will delete `baz` from the update in `Model.updateOne({}, { foo: 'bar', baz: undefined })` before sending the update to the server.
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

/*!
 * ignore
 */

Query.prototype._castConditions = function() {
  try {
    this.cast(this.model);
    this._unsetCastError();
  } catch (err) {
    this.error(err);
  }
};

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

  // Separate options to pass down to `completeMany()` in case we need to
  // set a session on the document
  const completeManyOptions = Object.assign({}, {
    session: get(this, 'options.session', null)
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
      return mongooseOptions.lean ?
        callback(null, docs) :
        completeMany(_this.model, docs, fields, userProvidedFields, completeManyOptions, callback);
    }

    const pop = helpers.preparePopulationOptionsMQ(_this, mongooseOptions);
    completeManyOptions.populated = pop;
    _this.model.populate(docs, pop, function(err, docs) {
      if (err) return callback(err);
      return mongooseOptions.lean ?
        callback(null, docs) :
        completeMany(_this.model, docs, fields, userProvidedFields, completeManyOptions, callback);
    });
  };

  const options = this._optionsForExec();
  options.projection = this._fieldsForExec();
  const filter = this._conditions;

  this._collection.find(filter, options, cb);
  return null;
});

/**
 * Find all documents that match `selector`. The result will be an array of documents.
 *
 * If there are too many documents in the result to fit in memory, use
 * [`Query.prototype.cursor()`](api.html#query_Query-cursor)
 *
 * ####Example
 *
 *     // Using async/await
 *     const arr = await Movie.find({ year: { $gte: 1980, $lte: 1989 } });
 *
 *     // Using callbacks
 *     Movie.find({ year: { $gte: 1980, $lte: 1989 } }, function(err, arr) {});
 *
 * @param {Object} [filter] mongodb selector. If not specified, returns all documents.
 * @param {Function} [callback]
 * @return {Query} this
 * @api public
 */

Query.prototype.find = function(conditions, callback) {
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

  this._find(callback);

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
  if (!doc) {
    return callback(null, null);
  }

  const model = this.model;
  const projection = utils.clone(this._fields);
  const userProvidedFields = this._userProvidedFields || {};
  // `populate`, `lean`
  const mongooseOptions = this._mongooseOptions;
  // `rawResult`
  const options = this.options;

  if (options.explain) {
    return callback(null, doc);
  }

  if (!mongooseOptions.populate) {
    return mongooseOptions.lean ?
      _completeOneLean(doc, res, options, callback) :
      completeOne(model, doc, res, options, projection, userProvidedFields,
        null, callback);
  }

  const pop = helpers.preparePopulationOptionsMQ(this, this._mongooseOptions);
  model.populate(doc, pop, (err, doc) => {
    if (err) {
      return callback(err);
    }
    return mongooseOptions.lean ?
      _completeOneLean(doc, res, options, callback) :
      completeOne(model, doc, res, options, projection, userProvidedFields,
        pop, callback);
  });
};

/**
 * Thunk around findOne()
 *
 * @param {Function} [callback]
 * @see findOne http://docs.mongodb.org/manual/reference/method/db.collection.findOne/
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
 * ####Example
 *
 *     var query  = Kitten.where({ color: 'white' });
 *     query.findOne(function (err, kitten) {
 *       if (err) return handleError(err);
 *       if (kitten) {
 *         // doc may be null if no document matched
 *       }
 *     });
 *
 * @param {Object} [filter] mongodb selector
 * @param {Object} [projection] optional fields to return
 * @param {Object} [options] see [`setOptions()`](http://mongoosejs.com/docs/api.html#query_Query-setOptions)
 * @param {Function} [callback] optional params are (error, document)
 * @return {Query} this
 * @see findOne http://docs.mongodb.org/manual/reference/method/db.collection.findOne/
 * @see Query.select #query_Query-select
 * @api public
 */

Query.prototype.findOne = function(conditions, projection, options, callback) {
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

  this.op = 'findOne';

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

  this._findOne(callback);

  return this;
};

/**
 * Thunk around count()
 *
 * @param {Function} [callback]
 * @see count http://docs.mongodb.org/manual/reference/method/db.collection.count/
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

  const conds = this._conditions;
  const options = this._optionsForExec();

  this._collection.count(conds, options, utils.tick(callback));
});

/**
 * Thunk around countDocuments()
 *
 * @param {Function} [callback]
 * @see countDocuments http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#countDocuments
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

  const conds = this._conditions;
  const options = this._optionsForExec();

  this._collection.collection.countDocuments(conds, options, utils.tick(callback));
});

/**
 * Thunk around estimatedDocumentCount()
 *
 * @param {Function} [callback]
 * @see estimatedDocumentCount http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#estimatedDocumentCount
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
 * ####Example:
 *
 *     var countQuery = model.where({ 'color': 'black' }).count();
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
 * @see count http://docs.mongodb.org/manual/reference/method/db.collection.count/
 * @api public
 */

Query.prototype.count = function(filter, callback) {
  if (typeof filter === 'function') {
    callback = filter;
    filter = undefined;
  }

  filter = utils.toObject(filter);

  if (mquery.canMerge(filter)) {
    this.merge(filter);
  }

  this.op = 'count';
  if (!callback) {
    return this;
  }

  this._count(callback);

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
 * ####Example:
 *
 *     await Model.find().estimatedDocumentCount();
 *
 * @param {Object} [options] passed transparently to the [MongoDB driver](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#estimatedDocumentCount)
 * @param {Function} [callback] optional params are (error, count)
 * @return {Query} this
 * @see estimatedDocumentCount http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#estimatedDocumentCount
 * @api public
 */

Query.prototype.estimatedDocumentCount = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }

  if (typeof options === 'object' && options != null) {
    this.setOptions(options);
  }

  this.op = 'estimatedDocumentCount';
  if (!callback) {
    return this;
  }

  this._estimatedDocumentCount(callback);

  return this;
};

/**
 * Specifies this query as a `countDocuments()` query. Behaves like `count()`,
 * except it always does a full collection scan when passed an empty filter `{}`.
 *
 * There are also minor differences in how `countDocuments()` handles
 * [`$where` and a couple geospatial operators](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#countDocuments).
 * versus `count()`.
 *
 * Passing a `callback` executes the query.
 *
 * This function triggers the following middleware.
 *
 * - `countDocuments()`
 *
 * ####Example:
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
 * [few operators that `countDocuments()` does not support](https://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#countDocuments).
 * Below are the operators that `count()` supports but `countDocuments()` does not,
 * and the suggested replacement:
 *
 * - `$where`: [`$expr`](https://docs.mongodb.com/manual/reference/operator/query/expr/)
 * - `$near`: [`$geoWithin`](https://docs.mongodb.com/manual/reference/operator/query/geoWithin/) with [`$center`](https://docs.mongodb.com/manual/reference/operator/query/center/#op._S_center)
 * - `$nearSphere`: [`$geoWithin`](https://docs.mongodb.com/manual/reference/operator/query/geoWithin/) with [`$centerSphere`](https://docs.mongodb.com/manual/reference/operator/query/centerSphere/#op._S_centerSphere)
 *
 * @param {Object} [filter] mongodb selector
 * @param {Function} [callback] optional params are (error, count)
 * @return {Query} this
 * @see countDocuments http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#countDocuments
 * @api public
 */

Query.prototype.countDocuments = function(conditions, callback) {
  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = undefined;
  }

  conditions = utils.toObject(conditions);

  if (mquery.canMerge(conditions)) {
    this.merge(conditions);
  }

  this.op = 'countDocuments';
  if (!callback) {
    return this;
  }

  this._countDocuments(callback);

  return this;
};

/**
 * Declares or executes a distict() operation.
 *
 * Passing a `callback` executes the query.
 *
 * This function does not trigger any middleware.
 *
 * ####Example
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
 * @see distinct http://docs.mongodb.org/manual/reference/method/db.collection.distinct/
 * @api public
 */

Query.prototype.distinct = function(field, conditions, callback) {
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

  if (callback != null) {
    this._castConditions();

    if (this.error() != null) {
      callback(this.error());
      return this;
    }
  }

  return Query.base.distinct.call(this, {}, field, callback);
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
 * ####Example
 *
 *     // sort by "field" ascending and "test" descending
 *     query.sort({ field: 'asc', test: -1 });
 *
 *     // equivalent
 *     query.sort('field -test');
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @param {Object|String} arg
 * @return {Query} this
 * @see cursor.sort http://docs.mongodb.org/manual/reference/method/cursor.sort/
 * @api public
 */

Query.prototype.sort = function(arg) {
  if (arguments.length > 1) {
    throw new Error('sort() only takes 1 Argument');
  }

  return Query.base.sort.call(this, arg);
};

/**
 * Declare and/or execute this query as a remove() operation.
 *
 * This function does not trigger any middleware
 *
 * ####Example
 *
 *     Model.remove({ artist: 'Anne Murray' }, callback)
 *
 * ####Note
 *
 * The operation is only executed when a callback is passed. To force execution without a callback, you must first call `remove()` and then execute it by using the `exec()` method.
 *
 *     // not executed
 *     var query = Model.find().remove({ name: 'Anne Murray' })
 *
 *     // executed
 *     query.remove({ name: 'Anne Murray' }, callback)
 *     query.remove({ name: 'Anne Murray' }).remove(callback)
 *
 *     // executed without a callback
 *     query.exec()
 *
 *     // summary
 *     query.remove(conds, fn); // executes
 *     query.remove(conds)
 *     query.remove(fn) // executes
 *     query.remove()
 *
 * @param {Object|Query} [filter] mongodb selector
 * @param {Function} [callback] optional params are (error, writeOpResult)
 * @return {Query} this
 * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
 * @see remove http://docs.mongodb.org/manual/reference/method/db.collection.remove/
 * @api public
 */

Query.prototype.remove = function(filter, callback) {
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

  this._remove(callback);
  return this;
};

/*!
 * ignore
 */

Query.prototype._remove = wrapThunk(function(callback) {
  this._castConditions();

  if (this.error() != null) {
    callback(this.error());
    return this;
  }

  callback = _wrapThunkCallback(this, callback);

  return Query.base.remove.call(this, helpers.handleWriteOpResult(callback));
});

/**
 * Declare and/or execute this query as a `deleteOne()` operation. Works like
 * remove, except it deletes at most one document regardless of the `single`
 * option.
 *
 * This function does not trigger any middleware.
 *
 * ####Example
 *
 *     Character.deleteOne({ name: 'Eddard Stark' }, callback)
 *     Character.deleteOne({ name: 'Eddard Stark' }).then(next)
 *
 * @param {Object|Query} [filter] mongodb selector
 * @param {Function} [callback] optional params are (error, writeOpResult)
 * @return {Query} this
 * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
 * @see remove http://docs.mongodb.org/manual/reference/method/db.collection.remove/
 * @api public
 */

Query.prototype.deleteOne = function(filter, callback) {
  if (typeof filter === 'function') {
    callback = filter;
    filter = null;
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

  this._deleteOne.call(this, callback);

  return this;
};

/*!
 * Internal thunk for `deleteOne()`
 */

Query.prototype._deleteOne = wrapThunk(function(callback) {
  this._castConditions();

  if (this.error() != null) {
    callback(this.error());
    return this;
  }

  callback = _wrapThunkCallback(this, callback);

  return Query.base.deleteOne.call(this, helpers.handleWriteOpResult(callback));
});

/**
 * Declare and/or execute this query as a `deleteMany()` operation. Works like
 * remove, except it deletes _every_ document that matches `criteria` in the
 * collection, regardless of the value of `single`.
 *
 * This function does not trigger any middleware
 *
 * ####Example
 *
 *     Character.deleteMany({ name: /Stark/, age: { $gte: 18 } }, callback)
 *     Character.deleteMany({ name: /Stark/, age: { $gte: 18 } }).then(next)
 *
 * @param {Object|Query} [filter] mongodb selector
 * @param {Function} [callback] optional params are (error, writeOpResult)
 * @return {Query} this
 * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
 * @see remove http://docs.mongodb.org/manual/reference/method/db.collection.remove/
 * @api public
 */

Query.prototype.deleteMany = function(filter, callback) {
  if (typeof filter === 'function') {
    callback = filter;
    filter = null;
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

  this._deleteMany.call(this, callback);

  return this;
};

/*!
 * Internal thunk around `deleteMany()`
 */

Query.prototype._deleteMany = wrapThunk(function(callback) {
  this._castConditions();

  if (this.error() != null) {
    callback(this.error());
    return this;
  }

  callback = _wrapThunkCallback(this, callback);

  return Query.base.deleteMany.call(this, helpers.handleWriteOpResult(callback));
});

/*!
 * hydrates a document
 *
 * @param {Model} model
 * @param {Document} doc
 * @param {Object} res 3rd parameter to callback
 * @param {Object} fields
 * @param {Query} self
 * @param {Array} [pop] array of paths used in population
 * @param {Function} callback
 */

function completeOne(model, doc, res, options, fields, userProvidedFields, pop, callback) {
  const opts = pop ?
    {populated: pop}
    : undefined;

  const casted = helpers.createModel(model, doc, fields, userProvidedFields);
  try {
    casted.init(doc, opts, _init);
  } catch (error) {
    _init(error);
  }

  function _init(err) {
    if (err) {
      return process.nextTick(() => callback(err));
    }

    casted.$session(options.session);

    if (options.rawResult) {
      res.value = casted;
      return process.nextTick(() => callback(null, res));
    }
    process.nextTick(() => callback(null, casted));
  }
}

/*!
 * If the model is a discriminator type and not root, then add the key & value to the criteria.
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
 * Issues a mongodb [findAndModify](http://www.mongodb.org/display/DOCS/findAndModify+Command) update command.
 *
 * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback. The query executes immediately if `callback` is passed.
 *
 * This function triggers the following middleware.
 *
 * - `findOneAndUpdate()`
 *
 * ####Available options
 *
 * - `new`: bool - if true, return the modified document rather than the original. defaults to false (changed in 4.0)
 * - `upsert`: bool - creates the object if it doesn't exist. defaults to false.
 * - `fields`: {Object|String} - Field selection. Equivalent to `.select(fields).findOneAndUpdate()`
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
 * - `runValidators`: if true, runs [update validators](/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
 * - `setDefaultsOnInsert`: if this and `upsert` are true, mongoose will apply the [defaults](http://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created. This option only works on MongoDB >= 2.4 because it relies on [MongoDB's `$setOnInsert` operator](https://docs.mongodb.org/v2.4/reference/operator/update/setOnInsert/).
 * - `rawResult`: if true, returns the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 * - `context` (string) if set to 'query' and `runValidators` is on, `this` will refer to the query in custom validator functions that update validation runs. Does nothing if `runValidators` is false.
 *
 * ####Callback Signature
 *     function(error, doc) {
 *       // error: any errors that occurred
 *       // doc: the document before updates are applied if `new: false`, or after updates if `new = true`
 *     }
 *
 * ####Examples
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
 * @param {Object|Query} [query]
 * @param {Object} [doc]
 * @param {Object} [options]
 * @param {Boolean} [options.rawResult] if true, returns the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {Boolean} [options.multipleCastError] by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
 * @param {Object} [options.lean] if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](http://mongoosejs.com/docs/api.html#query_Query-lean).
 * @param {Function} [callback] optional params are (error, doc), _unless_ `rawResult` is used, in which case params are (error, writeOpResult)
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
 * @return {Query} this
 * @api public
 */

Query.prototype.findOneAndUpdate = function(criteria, doc, options, callback) {
  this.op = 'findOneAndUpdate';
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

  if (options) {
    options = utils.clone(options);
    if (options.projection) {
      this.select(options.projection);
      delete options.projection;
    }
    if (options.fields) {
      this.select(options.fields);
      delete options.fields;
    }

    this.setOptions(options);
  }

  if (!callback) {
    return this;
  }

  this._findOneAndUpdate(callback);

  return this;
};

/*!
 * Thunk around findOneAndUpdate()
 *
 * @param {Function} [callback]
 * @api private
 */

Query.prototype._findOneAndUpdate = wrapThunk(function(callback) {
  if (this.error() != null) {
    return callback(this.error());
  }

  this._findAndModify('update', callback);
});

/**
 * Issues a mongodb [findAndModify](http://www.mongodb.org/display/DOCS/findAndModify+Command) remove command.
 *
 * Finds a matching document, removes it, passing the found document (if any) to the callback. Executes immediately if `callback` is passed.
 *
 * This function triggers the following middleware.
 *
 * - `findOneAndRemove()`
 *
 * ####Available options
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
 * - `rawResult`: if true, resolves to the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 *
 * ####Callback Signature
 *     function(error, doc) {
 *       // error: any errors that occurred
 *       // doc: the document before updates are applied if `new: false`, or after updates if `new = true`
 *     }
 *
 * ####Examples
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
 * @param {Boolean} [options.rawResult] if true, returns the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {Function} [callback] optional params are (error, document)
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @api public
 */

Query.prototype.findOneAndRemove = function(conditions, options, callback) {
  this.op = 'findOneAndRemove';
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

  this._findOneAndRemove(callback);

  return this;
};

/**
 * Issues a MongoDB [findOneAndDelete](https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete/) command.
 *
 * Finds a matching document, removes it, and passes the found document (if any) to the callback. Executes immediately if `callback` is passed.
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
 * ####Available options
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
 * - `rawResult`: if true, resolves to the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 *
 * ####Callback Signature
 *     function(error, doc) {
 *       // error: any errors that occurred
 *       // doc: the document before updates are applied if `new: false`, or after updates if `new = true`
 *     }
 *
 * ####Examples
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
 * @param {Boolean} [options.rawResult] if true, returns the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {Function} [callback] optional params are (error, document)
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @api public
 */

Query.prototype.findOneAndDelete = function(conditions, options, callback) {
  this.op = 'findOneAndDelete';
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

  this._findOneAndDelete(callback);

  return this;
};

/*!
 * Thunk around findOneAndDelete()
 *
 * @param {Function} [callback]
 * @return {Query} this
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
 * Finds a matching document, removes it, and passes the found document (if any) to the callback. Executes immediately if `callback` is passed.
 *
 * This function triggers the following middleware.
 *
 * - `findOneAndReplace()`
 *
 * ####Available options
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
 * - `rawResult`: if true, resolves to the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 *
 * ####Callback Signature
 *     function(error, doc) {
 *       // error: any errors that occurred
 *       // doc: the document before updates are applied if `new: false`, or after updates if `new = true`
 *     }
 *
 * ####Examples
 *
 *     A.where().findOneAndReplace(conditions, options, callback) // executes
 *     A.where().findOneAndReplace(conditions, options)  // return Query
 *     A.where().findOneAndReplace(conditions, callback) // executes
 *     A.where().findOneAndReplace(conditions) // returns Query
 *     A.where().findOneAndReplace(callback)   // executes
 *     A.where().findOneAndReplace()           // returns Query
 *
 * @method findOneAndReplace
 * @memberOf Query
 * @param {Object} [conditions]
 * @param {Object} [options]
 * @param {Boolean} [options.rawResult] if true, returns the [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 * @param {Boolean|String} [options.strict] overwrites the schema's [strict mode option](http://mongoosejs.com/docs/guide.html#strict)
 * @param {Function} [callback] optional params are (error, document)
 * @return {Query} this
 * @api public
 */

Query.prototype.findOneAndReplace = function(conditions, options, callback) {
  this.op = 'findOneAndReplace';
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

  this._findOneAndReplace(callback);

  return this;
};

/*!
 * Thunk around findOneAndReplace()
 *
 * @param {Function} [callback]
 * @return {Query} this
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
  let fields = null;

  if (this._fields != null) {
    options.projection = this._castFields(utils.clone(this._fields));
    fields = options.projection;
    if (fields instanceof Error) {
      callback(fields);
      return null;
    }
  }

  this._collection.collection.findOneAndReplace(filter, options, (err, res) => {
    if (err) {
      return callback(err);
    }

    const doc = res.value;

    return this._completeOne(doc, res, callback);
  });
});

/*!
 * Thunk around findOneAndRemove()
 *
 * @param {Function} [callback]
 * @return {Query} this
 * @api private
 */
Query.prototype._findOneAndRemove = wrapThunk(function(callback) {
  if (this.error() != null) {
    callback(this.error());
    return;
  }

  this._findAndModify('remove', callback);
});

/*!
 * Get options from query opts, falling back to the base mongoose object.
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

/*!
 * Override mquery.prototype._findAndModify to provide casting etc.
 *
 * @param {String} type - either "remove" or "update"
 * @param {Function} callback
 * @api private
 */

Query.prototype._findAndModify = function(type, callback) {
  if (typeof callback !== 'function') {
    throw new Error('Expected callback in _findAndModify');
  }

  const model = this.model;
  const schema = model.schema;
  const _this = this;
  let castedDoc = this._update;
  let fields;
  let doValidate;

  const castedQuery = castQuery(this);
  if (castedQuery instanceof Error) {
    return callback(castedQuery);
  }

  const opts = this._optionsForExec(model);

  if ('strict' in opts) {
    this._mongooseOptions.strict = opts.strict;
  }

  const isOverwriting = this.options.overwrite && !hasDollarKeys(castedDoc);
  if (isOverwriting) {
    castedDoc = new this.model(castedDoc, null, true);
  }

  if (type === 'remove') {
    opts.remove = true;
  } else {
    if (!('new' in opts)) {
      opts.new = false;
    }
    if (!('upsert' in opts)) {
      opts.upsert = false;
    }
    if (opts.upsert || opts['new']) {
      opts.remove = false;
    }

    if (isOverwriting) {
      doValidate = function(callback) {
        castedDoc.validate(callback);
      };
    } else {
      castedDoc = castDoc(this, opts.overwrite);
      castedDoc = setDefaultsOnInsert(this._conditions, schema, castedDoc, opts);
      if (!castedDoc) {
        if (opts.upsert) {
          // still need to do the upsert to empty doc
          const doc = utils.clone(castedQuery);
          delete doc._id;
          castedDoc = {$set: doc};
        } else {
          this.findOne(callback);
          return this;
        }
      } else if (castedDoc instanceof Error) {
        return callback(castedDoc);
      } else {
        // In order to make MongoDB 2.6 happy (see
        // https://jira.mongodb.org/browse/SERVER-12266 and related issues)
        // if we have an actual update document but $set is empty, junk the $set.
        if (castedDoc.$set && Object.keys(castedDoc.$set).length === 0) {
          delete castedDoc.$set;
        }
      }

      doValidate = updateValidators(this, schema, castedDoc, opts);
    }
  }

  this._applyPaths();

  const options = this._mongooseOptions;

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

  let _callback;

  let useFindAndModify = true;
  const runValidators = _getOption(this, 'runValidators', false);
  const base = _this.model && _this.model.base;
  const conn = get(model, 'collection.conn', {});
  if ('useFindAndModify' in base.options) {
    useFindAndModify = base.get('useFindAndModify');
  }
  if ('useFindAndModify' in conn.config) {
    useFindAndModify = conn.config.useFindAndModify;
  }
  if ('useFindAndModify' in options) {
    useFindAndModify = options.useFindAndModify;
  }
  if (useFindAndModify === false) {
    // Bypass mquery
    const collection = _this._collection.collection;
    if ('new' in opts) {
      opts.returnOriginal = !opts['new'];
      delete opts['new'];
    }

    if (type === 'remove') {
      collection.findOneAndDelete(castedQuery, opts, _wrapThunkCallback(_this, function(error, res) {
        return cb(error, res ? res.value : res, res);
      }));

      return this;
    }

    // honors legacy overwrite option for backward compatibility
    const updateMethod = isOverwriting ? 'findOneAndReplace' : 'findOneAndUpdate';

    if (runValidators && doValidate) {
      _callback = function(error) {
        if (error) {
          return callback(error);
        }
        if (castedDoc && castedDoc.toBSON) {
          castedDoc = castedDoc.toBSON();
        }

        collection[updateMethod](castedQuery, castedDoc, opts, _wrapThunkCallback(_this, function(error, res) {
          return cb(error, res ? res.value : res, res);
        }));
      };

      try {
        doValidate(_callback);
      } catch (error) {
        callback(error);
      }
    } else {
      if (castedDoc && castedDoc.toBSON) {
        castedDoc = castedDoc.toBSON();
      }
      collection[updateMethod](castedQuery, castedDoc, opts, _wrapThunkCallback(_this, function(error, res) {
        return cb(error, res ? res.value : res, res);
      }));
    }

    return this;
  }

  if (runValidators && doValidate) {
    _callback = function(error) {
      if (error) {
        return callback(error);
      }
      if (castedDoc && castedDoc.toBSON) {
        castedDoc = castedDoc.toBSON();
      }
      _this._collection.findAndModify(castedQuery, castedDoc, opts, _wrapThunkCallback(_this, function(error, res) {
        return cb(error, res ? res.value : res, res);
      }));
    };

    try {
      doValidate(_callback);
    } catch (error) {
      callback(error);
    }
  } else {
    if (castedDoc && castedDoc.toBSON) {
      castedDoc = castedDoc.toBSON();
    }
    this._collection.findAndModify(castedQuery, castedDoc, opts, _wrapThunkCallback(_this, function(error, res) {
      return cb(error, res ? res.value : res, res);
    }));
  }

  return this;
};

/*!
 * ignore
 */

function _completeOneLean(doc, res, opts, callback) {
  if (opts.rawResult) {
    return callback(null, res);
  }
  return callback(null, doc);
}

/*!
 * Override mquery.prototype._mergeUpdate to handle mongoose objects in
 * updates.
 *
 * @param {Object} doc
 * @api private
 */

Query.prototype._mergeUpdate = function(doc) {
  if (!this._update) this._update = {};
  if (doc instanceof Query) {
    if (doc._update) {
      utils.mergeClone(this._update, doc._update);
    }
  } else {
    utils.mergeClone(this._update, doc);
  }
};

/*!
 * The mongodb driver 1.3.23 only supports the nested array sort
 * syntax. We must convert it or sorting findAndModify will not work.
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
  const schema = this.model.schema;
  let doValidate;
  const _this = this;

  this._castConditions();

  if (this.error() != null) {
    callback(this.error());
    return null;
  }

  callback = _wrapThunkCallback(this, callback);

  const castedQuery = this._conditions;
  let castedDoc;
  const options = this._optionsForExec(this.model);

  ++this._executionCount;

  this._update = utils.clone(this._update, options);
  const isOverwriting = this.options.overwrite && !hasDollarKeys(this._update);
  if (isOverwriting) {
    castedDoc = new this.model(this._update, null, true);
  } else {
    castedDoc = castDoc(this, options.overwrite);

    if (castedDoc instanceof Error) {
      callback(castedDoc);
      return null;
    }

    if (castedDoc == null || Object.keys(castedDoc).length === 0) {
      callback(null, 0);
      return null;
    }

    castedDoc = setDefaultsOnInsert(this._conditions, this.model.schema,
      castedDoc, options);
  }

  const runValidators = _getOption(this, 'runValidators', false);
  if (runValidators) {
    if (isOverwriting) {
      doValidate = function(callback) {
        castedDoc.validate(callback);
      };
    } else {
      doValidate = updateValidators(this, schema, castedDoc, options);
    }
    const _callback = function(err) {
      if (err) {
        return callback(err);
      }

      if (castedDoc.toBSON) {
        castedDoc = castedDoc.toBSON();
      }
      _this._collection[op](castedQuery, castedDoc, options, callback);
    };
    try {
      doValidate(_callback);
    } catch (err) {
      process.nextTick(function() {
        callback(err);
      });
    }
    return null;
  }

  if (castedDoc.toBSON) {
    castedDoc = castedDoc.toBSON();
  }

  this._collection[op](castedQuery, castedDoc, options, callback);
  return null;
}

/*!
 * Internal thunk for .update()
 *
 * @param {Function} callback
 * @see Model.update #model_Model.update
 * @api private
 */
Query.prototype._execUpdate = wrapThunk(function(callback) {
  return _updateThunk.call(this, 'update', callback);
});

/*!
 * Internal thunk for .updateMany()
 *
 * @param {Function} callback
 * @see Model.update #model_Model.update
 * @api private
 */
Query.prototype._updateMany = wrapThunk(function(callback) {
  return _updateThunk.call(this, 'updateMany', callback);
});

/*!
 * Internal thunk for .updateOne()
 *
 * @param {Function} callback
 * @see Model.update #model_Model.update
 * @api private
 */
Query.prototype._updateOne = wrapThunk(function(callback) {
  return _updateThunk.call(this, 'updateOne', callback);
});

/*!
 * Internal thunk for .replaceOne()
 *
 * @param {Function} callback
 * @see Model.replaceOne #model_Model.replaceOne
 * @api private
 */
Query.prototype._replaceOne = wrapThunk(function(callback) {
  return _updateThunk.call(this, 'replaceOne', callback);
});

/**
 * Declare and/or execute this query as an update() operation.
 *
 * _All paths passed that are not $atomic operations will become $set ops._
 *
 * This function triggers the following middleware.
 *
 * - `update()`
 *
 * ####Example
 *
 *     Model.where({ _id: id }).update({ title: 'words' })
 *
 *     // becomes
 *
 *     Model.where({ _id: id }).update({ $set: { title: 'words' }})
 *
 * ####Valid options:
 *
 *  - `upsert` (boolean) whether to create the doc if it doesn't match (false)
 *  - `multi` (boolean) whether multiple documents should be updated (false)
 *  - `runValidators`: if true, runs [update validators](/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
 *  - `setDefaultsOnInsert`: if this and `upsert` are true, mongoose will apply the [defaults](http://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created. This option only works on MongoDB >= 2.4 because it relies on [MongoDB's `$setOnInsert` operator](https://docs.mongodb.org/v2.4/reference/operator/update/setOnInsert/).
 *  - `strict` (boolean) overrides the `strict` option for this update
 *  - `overwrite` (boolean) disables update-only mode, allowing you to overwrite the doc (false)
 *  - `context` (string) if set to 'query' and `runValidators` is on, `this` will refer to the query in custom validator functions that update validation runs. Does nothing if `runValidators` is false.
 *  - `read`
 *  - `writeConcern`
 *
 * ####Note
 *
 * Passing an empty object `{}` as the doc will result in a no-op unless the `overwrite` option is passed. Without the `overwrite` option set, the update operation will be ignored and the callback executed without sending the command to MongoDB so as to prevent accidently overwritting documents in the collection.
 *
 * ####Note
 *
 * The operation is only executed when a callback is passed. To force execution without a callback, we must first call update() and then execute it by using the `exec()` method.
 *
 *     var q = Model.where({ _id: id });
 *     q.update({ $set: { name: 'bob' }}).update(); // not executed
 *
 *     q.update({ $set: { name: 'bob' }}).exec(); // executed
 *
 *     // keys that are not $atomic ops become $set.
 *     // this executes the same command as the previous example.
 *     q.update({ name: 'bob' }).exec();
 *
 *     // overwriting with empty docs
 *     var q = Model.where({ _id: id }).setOptions({ overwrite: true })
 *     q.update({ }, callback); // executes
 *
 *     // multi update with overwrite to empty doc
 *     var q = Model.where({ _id: id });
 *     q.setOptions({ multi: true, overwrite: true })
 *     q.update({ });
 *     q.update(callback); // executed
 *
 *     // multi updates
 *     Model.where()
 *          .update({ name: /^match/ }, { $set: { arr: [] }}, { multi: true }, callback)
 *
 *     // more multi updates
 *     Model.where()
 *          .setOptions({ multi: true })
 *          .update({ $set: { arr: [] }}, callback)
 *
 *     // single update by default
 *     Model.where({ email: 'address@example.com' })
 *          .update({ $inc: { counter: 1 }}, callback)
 *
 * API summary
 *
 *     update(criteria, doc, options, cb) // executes
 *     update(criteria, doc, options)
 *     update(criteria, doc, cb) // executes
 *     update(criteria, doc)
 *     update(doc, cb) // executes
 *     update(doc)
 *     update(cb) // executes
 *     update(true) // executes
 *     update()
 *
 * @param {Object} [criteria]
 * @param {Object} [doc] the update command
 * @param {Object} [options]
 * @param {Boolean} [options.multipleCastError] by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
 * @param {Function} [callback] optional, params are (error, writeOpResult)
 * @return {Query} this
 * @see Model.update #model_Model.update
 * @see update http://docs.mongodb.org/manual/reference/method/db.collection.update/
 * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
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
 * @param {Object} [criteria]
 * @param {Object} [doc] the update command
 * @param {Object} [options]
 @param {Boolean} [options.multipleCastError] by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
 * @param {Function} [callback] optional params are (error, writeOpResult)
 * @return {Query} this
 * @see Model.update #model_Model.update
 * @see update http://docs.mongodb.org/manual/reference/method/db.collection.update/
 * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
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
 * `update()`, except it does not support the `multi` or `overwrite` options.
 *
 * - MongoDB will update _only_ the first document that matches `criteria` regardless of the value of the `multi` option.
 * - Use `replaceOne()` if you want to overwrite an entire document rather than using atomic operators like `$set`.
 *
 * **Note** updateOne will _not_ fire update middleware. Use `pre('updateOne')`
 * and `post('updateOne')` instead.
 *
 * This function triggers the following middleware.
 *
 * - `updateOne()`
 *
 * @param {Object} [criteria]
 * @param {Object} [doc] the update command
 * @param {Object} [options]
 @param {Boolean} [options.multipleCastError] by default, mongoose only returns the first error that occurred in casting the query. Turn on this option to aggregate all the cast errors.
 * @param {Function} [callback] params are (error, writeOpResult)
 * @return {Query} this
 * @see Model.update #model_Model.update
 * @see update http://docs.mongodb.org/manual/reference/method/db.collection.update/
 * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
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
 * not accept any atomic operators (`$set`, etc.)
 *
 * **Note** replaceOne will _not_ fire update middleware. Use `pre('replaceOne')`
 * and `post('replaceOne')` instead.
 *
 * This function triggers the following middleware.
 *
 * - `replaceOne()`
 *
 * @param {Object} [criteria]
 * @param {Object} [doc] the update command
 * @param {Object} [options]
 * @param {Function} [callback] optional params are (error, writeOpResult)
 * @return {Query} this
 * @see Model.update #model_Model.update
 * @see update http://docs.mongodb.org/manual/reference/method/db.collection.update/
 * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
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

/*!
 * Internal helper for update, updateMany, updateOne, replaceOne
 */

function _update(query, op, filter, doc, options, callback) {
  // make sure we don't send in the whole Document to merge()
  query.op = op;
  filter = utils.toObject(filter);
  doc = doc || {};

  const oldCb = callback;
  if (oldCb) {
    if (typeof oldCb === 'function') {
      callback = function(error, result) {
        oldCb(error, result ? result.result : {ok: 0, n: 0, nModified: 0});
      };
    } else {
      throw new Error('Invalid callback() argument.');
    }
  }

  // strict is an option used in the update checking, make sure it gets set
  if (options) {
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
    if (op === 'update') {
      query._execUpdate(callback);
      return query;
    }
    query['_' + op](callback);
    return query;
  }

  return Query.base[op].call(query, filter, doc, options, callback);
}

/**
 * Runs a function `fn` and treats the return value of `fn` as the new value
 * for the query to resolve to.
 *
 * Any functions you pass to `map()` will run **after** any post hooks.
 *
 * ####Example:
 *
 *     const res = await MyModel.findOne().map(res => {
 *       // Sets a `loadedAt` property on the doc that tells you the time the
 *       // document was loaded.
 *       return res == null ?
 *         res :
 *         Object.assign(res, { loadedAt: new Date() });
 *     });
 *
 * @method map
 * @memberOf Query
 * @instance
 * @param {Function} fn function to run to transform the query result
 * @return {Query} this
 */

Query.prototype.map = function(fn) {
  this._transforms.push(fn);
  return this;
};

/**
 * Make this query throw an error if no documents match the given `filter`.
 * This is handy for integrating with async/await, because `orFail()` saves you
 * an extra `if` statement to check if no document was found.
 *
 * ####Example:
 *
 *     // Throws if no doc returned
 *     await Model.findOne({ foo: 'bar' }).orFail();
 *
 *     // Throws if no document was updated
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
 * @param {Function|Error} [err] optional error to throw if no docs match `filter`
 * @return {Query} this
 */

Query.prototype.orFail = function(err) {
  this.map(res => {
    switch (this.op) {
      case 'find':
        if (res.length === 0) {
          err = typeof err === 'function' ? err.call(this) : err;
          throw err;
        }
        break;
      case 'findOne':
        if (res == null) {
          err = typeof err === 'function' ? err.call(this) : err;
          throw err;
        }
        break;
      case 'update':
      case 'updateMany':
      case 'updateOne':
        if (get(res, 'result.nModified') === 0) {
          err = typeof err === 'function' ? err.call(this) : err;
          throw err;
        }
        break;
      case 'findOneAndDelete':
        if (get(res, 'lastErrorObject.n') === 0) {
          err = typeof err === 'function' ? err.call(this) : err;
          throw err;
        }
        break;
      case 'findOneAndUpdate':
        if (get(res, 'lastErrorObject.updatedExisting') === false) {
          err = typeof err === 'function' ? err.call(this) : err;
          throw err;
        }
        break;
      case 'deleteMany':
      case 'deleteOne':
      case 'remove':
        if (res.n === 0) {
          err = typeof err === 'function' ? err.call(this) : err;
          throw err;
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
 * Executes the query
 *
 * ####Examples:
 *
 *     var promise = query.exec();
 *     var promise = query.exec('update');
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

  if (typeof op === 'function') {
    callback = op;
    op = null;
  } else if (typeof op === 'string') {
    this.op = op;
  }

  if (callback != null) {
    callback = this.model.$wrapCallback(callback);
  }

  return utils.promiseOrCallback(callback, (cb) => {
    if (!_this.op) {
      cb();
      return;
    }

    this._hooks.execPre('exec', this, [], (error) => {
      if (error) {
        return cb(error);
      }
      this[this.op].call(this, (error, res) => {
        if (error) {
          return cb(error);
        }

        this._hooks.execPost('exec', this, [], {}, (error) => {
          if (error) {
            return cb(error);
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
 * @param {Function} [reject]
 * @return {Promise}
 * @api public
 */

Query.prototype.catch = function(reject) {
  return this.exec().then(null, reject);
};

/*!
 * ignore
 */

Query.prototype._pre = function(fn) {
  this._hooks.pre('exec', fn);
  return this;
};

/*!
 * ignore
 */

Query.prototype._post = function(fn) {
  this._hooks.post('exec', fn);
  return this;
};

/*!
 * Casts obj for an update command.
 *
 * @param {Object} obj
 * @return {Object} obj after casting its values
 * @api private
 */

Query.prototype._castUpdate = function _castUpdate(obj, overwrite) {
  let strict;
  if ('strict' in this._mongooseOptions) {
    strict = this._mongooseOptions.strict;
  } else if (this.schema && this.schema.options) {
    strict = this.schema.options.strict;
  } else {
    strict = true;
  }

  let omitUndefined = false;
  if ('omitUndefined' in this._mongooseOptions) {
    omitUndefined = this._mongooseOptions.omitUndefined;
  }

  let useNestedStrict;
  if ('useNestedStrict' in this.options) {
    useNestedStrict = this.options.useNestedStrict;
  }

  return castUpdate(this.schema, obj, {
    overwrite: overwrite,
    strict: strict,
    omitUndefined,
    useNestedStrict: useNestedStrict
  }, this, this._conditions);
};

/*!
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

/*!
 * castDoc
 * @api private
 */

function castDoc(query, overwrite) {
  try {
    return query._castUpdate(query._update, overwrite);
  } catch (err) {
    return err;
  }
}

/**
 * Specifies paths which should be populated with other documents.
 *
 * ####Example:
 *
 *     Kitten.findOne().populate('owner').exec(function (err, kitten) {
 *       console.log(kitten.owner.name) // Max
 *     })
 *
 *     Kitten.find().populate({
 *         path: 'owner'
 *       , select: 'name'
 *       , match: { color: 'black' }
 *       , options: { sort: { name: -1 }}
 *     }).exec(function (err, kittens) {
 *       console.log(kittens[0].owner.name) // Zoopa
 *     })
 *
 *     // alternatively
 *     Kitten.find().populate('owner', 'name', null, {sort: { name: -1 }}).exec(function (err, kittens) {
 *       console.log(kittens[0].owner.name) // Zoopa
 *     })
 *
 * Paths are populated after the query executes and a response is received. A separate query is then executed for each path specified for population. After a response for each query has also been returned, the results are passed to the callback.
 *
 * @param {Object|String} path either the path to populate or an object specifying all parameters
 * @param {Object|String} [select] Field selection for the population query
 * @param {Model} [model] The model you wish to use for population. If not specified, populate will look up the model by the name in the Schema's `ref` field.
 * @param {Object} [match] Conditions for the population query
 * @param {Object} [options] Options for the population query (sort, etc)
 * @see population ./populate.html
 * @see Query#select #query_Query-select
 * @see Model.populate #model_Model.populate
 * @return {Query} this
 * @api public
 */

Query.prototype.populate = function() {
  if (arguments.length === 0) {
    return this;
  }

  const res = utils.populate.apply(null, arguments);

  // Propagate readConcern and readPreference and lean from parent query,
  // unless one already specified
  if (this.options != null) {
    const readConcern = this.options.readConcern;
    const readPref = this.options.readPreference;

    for (let i = 0; i < res.length; ++i) {
      if (readConcern != null && get(res[i], 'options.readConcern') == null) {
        res[i].options = res[i].options || {};
        res[i].options.readConcern = readConcern;
      }
      if (readPref != null && get(res[i], 'options.readPreference') == null) {
        res[i].options = res[i].options || {};
        res[i].options.readPreference = readPref;
      }
    }
  }

  const opts = this._mongooseOptions;

  if (opts.lean != null) {
    const lean = opts.lean;
    for (let i = 0; i < res.length; ++i) {
      if (get(res[i], 'options.lean') == null) {
        res[i].options = res[i].options || {};
        res[i].options.lean = lean;
      }
    }
  }

  if (!utils.isObject(opts.populate)) {
    opts.populate = {};
  }

  const pop = opts.populate;

  for (let i = 0; i < res.length; ++i) {
    const path = res[i].path;
    if (pop[path] && pop[path].populate && res[i].populate) {
      res[i].populate = pop[path].populate.concat(res[i].populate);
    }
    pop[res[i].path] = res[i];
  }

  return this;
};

/**
 * Gets a list of paths to be populated by this query
 *
 * ####Example:
 *      bookSchema.pre('findOne', function() {
 *        let keys = this.getPopulatedPaths(); // ['author']
 *      })
 *      ...
 *      Book.findOne({}).populate('author')
 *
 * @return {Array} an array of strings representing populated paths
 * @api public
 */

Query.prototype.getPopulatedPaths = function getPopulatedPaths() {
  const obj = this._mongooseOptions.populate || {};
  return Object.keys(obj);
};

/**
 * Casts this query to the schema of `model`
 *
 * ####Note
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

  try {
    return cast(model.schema, obj, {
      upsert: this.options && this.options.upsert,
      strict: (this.options && 'strict' in this.options) ?
        this.options.strict :
        get(model, 'schema.options.strict', null),
      strictQuery: (this.options && this.options.strictQuery) ||
        get(model, 'schema.options.strictQuery', null)
    }, this);
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
 * @see http://docs.mongodb.org/manual/reference/projection/elemMatch/
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
    selectPopulatedFields(this);
  }
};

/**
 * Returns a wrapper around a [mongodb driver cursor](http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html).
 * A QueryCursor exposes a Streams3 interface, as well as a `.next()` function.
 *
 * The `.cursor()` function triggers pre find hooks, but **not** post find hooks.
 *
 * ####Example
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
 *     var cursor = Thing.find({ name: /^hello/ }).cursor();
 *     cursor.next(function(error, doc) {
 *       console.log(doc);
 *     });
 *
 *     // Because `.next()` returns a promise, you can use co
 *     // to easily iterate through all documents without loading them
 *     // all into memory.
 *     co(function*() {
 *       const cursor = Thing.find({ name: /^hello/ }).cursor();
 *       for (let doc = yield cursor.next(); doc != null; doc = yield cursor.next()) {
 *         console.log(doc);
 *       }
 *     });
 *
 * ####Valid options
 *
 *   - `transform`: optional function which accepts a mongoose document. The return value of the function will be emitted on `data` and returned by `.next()`.
 *
 * @return {QueryCursor}
 * @param {Object} [options]
 * @see QueryCursor
 * @api public
 */

Query.prototype.cursor = function cursor(opts) {
  this._applyPaths();
  this._fields = this._castFields(this._fields);
  this.setOptions({ projection: this._fieldsForExec() });
  if (opts) {
    this.setOptions(opts);
  }

  try {
    this.cast(this.model);
  } catch (err) {
    return (new QueryCursor(this, this.options))._markError(err);
  }

  return new QueryCursor(this, this.options);
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
 * ####Example
 *
 *     query.tailable() // true
 *     query.tailable(true)
 *     query.tailable(false)
 *
 * ####Note
 *
 * Cannot be used with `distinct()`
 *
 * @param {Boolean} bool defaults to true
 * @param {Object} [opts] options to set
 * @param {Number} [opts.numberOfRetries] if cursor is exhausted, retry this many times before giving up
 * @param {Number} [opts.tailableRetryInterval] if cursor is exhausted, wait this many milliseconds before retrying
 * @see tailable http://docs.mongodb.org/manual/tutorial/create-tailable-cursor/
 * @api public
 */

Query.prototype.tailable = function(val, opts) {
  // we need to support the tailable({ awaitdata : true }) as well as the
  // tailable(true, {awaitdata :true}) syntax that mquery does not support
  if (val && val.constructor.name === 'Object') {
    opts = val;
    val = true;
  }

  if (val === undefined) {
    val = true;
  }

  if (opts && typeof opts === 'object') {
    for (const key in opts) {
      if (key === 'awaitdata') {
        // For backwards compatibility
        this.options[key] = !!opts[key];
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
 * ####Example
 *
 *     query.where('path').intersects().geometry({
 *         type: 'LineString'
 *       , coordinates: [[180.0, 11.0], [180, 9.0]]
 *     })
 *
 *     query.where('path').intersects({
 *         type: 'LineString'
 *       , coordinates: [[180.0, 11.0], [180, 9.0]]
 *     })
 *
 * ####NOTE:
 *
 * **MUST** be used after `where()`.
 *
 * ####NOTE:
 *
 * In Mongoose 3.7, `intersects` changed from a getter to a function. If you need the old syntax, use [this](https://github.com/ebensing/mongoose-within).
 *
 * @method intersects
 * @memberOf Query
 * @instance
 * @param {Object} [arg]
 * @return {Query} this
 * @see $geometry http://docs.mongodb.org/manual/reference/operator/geometry/
 * @see geoIntersects http://docs.mongodb.org/manual/reference/operator/geoIntersects/
 * @api public
 */

/**
 * Specifies a `$geometry` condition
 *
 * ####Example
 *
 *     var polyA = [[[ 10, 20 ], [ 10, 40 ], [ 30, 40 ], [ 30, 20 ]]]
 *     query.where('loc').within().geometry({ type: 'Polygon', coordinates: polyA })
 *
 *     // or
 *     var polyB = [[ 0, 0 ], [ 1, 1 ]]
 *     query.where('loc').within().geometry({ type: 'LineString', coordinates: polyB })
 *
 *     // or
 *     var polyC = [ 0, 0 ]
 *     query.where('loc').within().geometry({ type: 'Point', coordinates: polyC })
 *
 *     // or
 *     query.where('loc').intersects().geometry({ type: 'Point', coordinates: polyC })
 *
 * The argument is assigned to the most recent path passed to `where()`.
 *
 * ####NOTE:
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
 * @see $geometry http://docs.mongodb.org/manual/reference/operator/geometry/
 * @see http://docs.mongodb.org/manual/release-notes/2.4/#new-geospatial-indexes-with-geojson-and-improved-spherical-geometry
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

/**
 * Specifies a `$near` or `$nearSphere` condition
 *
 * These operators return documents sorted by distance.
 *
 * ####Example
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
 * @see $near http://docs.mongodb.org/manual/reference/operator/near/
 * @see $nearSphere http://docs.mongodb.org/manual/reference/operator/nearSphere/
 * @see $maxDistance http://docs.mongodb.org/manual/reference/operator/maxDistance/
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

/*!
 * Overwriting mquery is needed to support a couple different near() forms found in older
 * versions of mongoose
 * near([1,1])
 * near(1,1)
 * near(field, [1,2])
 * near(field, 1, 2)
 * In addition to all of the normal forms supported by mquery
 */

Query.prototype.near = function() {
  const params = [];
  const sphere = this._mongooseOptions.nearSphere;

  // TODO refactor

  if (arguments.length === 1) {
    if (Array.isArray(arguments[0])) {
      params.push({center: arguments[0], spherical: sphere});
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
      params.push({center: [arguments[0], arguments[1]], spherical: sphere});
    } else if (typeof arguments[0] === 'string' && Array.isArray(arguments[1])) {
      params.push(arguments[0]);
      params.push({center: arguments[1], spherical: sphere});
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
      params.push({center: [arguments[1], arguments[2]], spherical: sphere});
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
 * ####Example
 *
 *     query.where('loc').nearSphere({ center: [10, 10], maxDistance: 5 });
 *
 * **Deprecated.** Use `query.near()` instead with the `spherical` option set to `true`.
 *
 * ####Example
 *
 *     query.where('loc').near({ center: [10, 10], spherical: true });
 *
 * @deprecated
 * @see near() #query_Query-near
 * @see $near http://docs.mongodb.org/manual/reference/operator/near/
 * @see $nearSphere http://docs.mongodb.org/manual/reference/operator/nearSphere/
 * @see $maxDistance http://docs.mongodb.org/manual/reference/operator/maxDistance/
 */

Query.prototype.nearSphere = function() {
  this._mongooseOptions.nearSphere = true;
  this.near.apply(this, arguments);
  return this;
};

/**
 * Returns an asyncIterator for use with [`for/await/of` loops](http://bit.ly/async-iterators)
 * This function *only* works for `find()` queries.
 * You do not need to call this function explicitly, the JavaScript runtime
 * will call it for you.
 *
 * ####Example
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
    return this.cursor().transformNull().map(doc => {
      return doc == null ? { done: true } : { value: doc, done: false };
    });
  };
}

/**
 * Specifies a $polygon condition
 *
 * ####Example
 *
 *     query.where('loc').within().polygon([10,20], [13, 25], [7,15])
 *     query.polygon('loc', [10,20], [13, 25], [7,15])
 *
 * @method polygon
 * @memberOf Query
 * @instance
 * @param {String|Array} [path]
 * @param {Array|Object} [coordinatePairs...]
 * @return {Query} this
 * @see $polygon http://docs.mongodb.org/manual/reference/operator/polygon/
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

/**
 * Specifies a $box condition
 *
 * ####Example
 *
 *     var lowerLeft = [40.73083, -73.99756]
 *     var upperRight= [40.741404,  -73.988135]
 *
 *     query.where('loc').within().box(lowerLeft, upperRight)
 *     query.box({ ll : lowerLeft, ur : upperRight })
 *
 * @method box
 * @memberOf Query
 * @instance
 * @see $box http://docs.mongodb.org/manual/reference/operator/box/
 * @see within() Query#within #query_Query-within
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @param {Object} val
 * @param [Array] Upper Right Coords
 * @return {Query} this
 * @api public
 */

/*!
 * this is needed to support the mongoose syntax of:
 * box(field, { ll : [x,y], ur : [x2,y2] })
 * box({ ll : [x,y], ur : [x2,y2] })
 */

Query.prototype.box = function(ll, ur) {
  if (!Array.isArray(ll) && utils.isObject(ll)) {
    ur = ll.ur;
    ll = ll.ll;
  }
  return Query.base.box.call(this, ll, ur);
};

/**
 * Specifies a $center or $centerSphere condition.
 *
 * ####Example
 *
 *     var area = { center: [50, 50], radius: 10, unique: true }
 *     query.where('loc').within().circle(area)
 *     // alternatively
 *     query.circle('loc', area);
 *
 *     // spherical calculations
 *     var area = { center: [50, 50], radius: 10, unique: true, spherical: true }
 *     query.where('loc').within().circle(area)
 *     // alternatively
 *     query.circle('loc', area);
 *
 * New in 3.7.0
 *
 * @method circle
 * @memberOf Query
 * @instance
 * @param {String} [path]
 * @param {Object} area
 * @return {Query} this
 * @see $center http://docs.mongodb.org/manual/reference/operator/center/
 * @see $centerSphere http://docs.mongodb.org/manual/reference/operator/centerSphere/
 * @see $geoWithin http://docs.mongodb.org/manual/reference/operator/geoWithin/
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
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
 * _DEPRECATED_ Specifies a $centerSphere condition
 *
 * **Deprecated.** Use [circle](#query_Query-circle) instead.
 *
 * ####Example
 *
 *     var area = { center: [50, 50], radius: 10 };
 *     query.where('loc').within().centerSphere(area);
 *
 * @deprecated
 * @param {String} [path]
 * @param {Object} val
 * @return {Query} this
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @see $centerSphere http://docs.mongodb.org/manual/reference/operator/centerSphere/
 * @api public
 */

Query.prototype.centerSphere = function() {
  if (arguments[0] && arguments[0].constructor.name === 'Object') {
    arguments[0].spherical = true;
  }

  if (arguments[1] && arguments[1].constructor.name === 'Object') {
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
 *     query.selectedInclusively() // false
 *     query.select('name')
 *     query.selectedInclusively() // true
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
 *     query.selectedExclusively() // false
 *     query.select('-name')
 *     query.selectedExclusively() // true
 *     query.selectedInclusively() // false
 *
 * @method selectedExclusively
 * @memberOf Query
 * @instance
 * @return {Boolean}
 * @api public
 */

Query.prototype.selectedExclusively = function selectedExclusively() {
  if (!this._fields) {
    return false;
  }

  const keys = Object.keys(this._fields);
  if (keys.length === 0) {
    return false;
  }

  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i];
    if (key === '_id') {
      continue;
    }
    if (this._fields[key] === 0 || this._fields[key] === false) {
      return true;
    }
  }

  return false;
};

/*!
 * Export
 */

module.exports = Query;
