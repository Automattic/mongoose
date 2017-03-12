/*!
 * Module dependencies.
 */

var PromiseProvider = require('./promise_provider');
var QueryCursor = require('./querycursor');
var QueryStream = require('./querystream');
var StrictModeError = require('./error/strict');
var cast = require('./cast');
var helpers = require('./queryhelpers');
var mquery = require('mquery');
var readPref = require('./drivers').ReadPreference;
var setDefaultsOnInsert = require('./services/setDefaultsOnInsert');
var updateValidators = require('./services/updateValidators');
var util = require('util');
var utils = require('./utils');

/**
 * Query constructor used for building queries.
 *
 * ####Example:
 *
 *     var query = new Query();
 *     query.setOptions({ lean : true });
 *     query.collection(model.collection);
 *     query.where('age').gte(21).exec(callback);
 *
 * @param {Object} [options]
 * @param {Object} [model]
 * @param {Object} [conditions]
 * @param {Object} [collection] Mongoose collection
 * @api private
 */

function Query(conditions, options, model, collection) {
  // this stuff is for dealing with custom queries created by #toConstructor
  if (!this._mongooseOptions) {
    this._mongooseOptions = {};
  }

  // this is the case where we have a CustomQuery, we need to check if we got
  // options passed in, and if we did, merge them in
  if (options) {
    var keys = Object.keys(options);
    for (var i = 0; i < keys.length; ++i) {
      var k = keys[i];
      this._mongooseOptions[k] = options[k];
    }
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

  if (this.schema) {
    var kareemOptions = {
      useErrorHandlers: true,
      numCallbackParams: 1
    };
    this._count = this.model.hooks.createWrapper('count',
        Query.prototype._count, this, kareemOptions);
    this._execUpdate = this.model.hooks.createWrapper('update',
        Query.prototype._execUpdate, this, kareemOptions);
    this._find = this.model.hooks.createWrapper('find',
        Query.prototype._find, this, kareemOptions);
    this._findOne = this.model.hooks.createWrapper('findOne',
        Query.prototype._findOne, this, kareemOptions);
    this._findOneAndRemove = this.model.hooks.createWrapper('findOneAndRemove',
        Query.prototype._findOneAndRemove, this, kareemOptions);
    this._findOneAndUpdate = this.model.hooks.createWrapper('findOneAndUpdate',
        Query.prototype._findOneAndUpdate, this, kareemOptions);
    this._updateMany = this.model.hooks.createWrapper('updateMany',
        Query.prototype._updateMany, this, kareemOptions);
    this._updateOne = this.model.hooks.createWrapper('updateOne',
        Query.prototype._updateOne, this, kareemOptions);
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
  var model = this.model;
  var coll = this.mongooseCollection;

  var CustomQuery = function(criteria, options) {
    if (!(this instanceof CustomQuery)) {
      return new CustomQuery(criteria, options);
    }
    this._mongooseOptions = utils.clone(p._mongooseOptions);
    Query.call(this, criteria, options || null, model, coll);
  };

  util.inherits(CustomQuery, Query);

  // set inherited defaults
  var p = CustomQuery.prototype;

  p.options = {};

  p.setOptions(this.options);

  p.op = this.op;
  p._conditions = utils.clone(this._conditions, { retainKeyOrder: true });
  p._fields = utils.clone(this._fields);
  p._update = utils.clone(this._update);
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
 * @param {String|Object} [path]
 * @param {any} [val]
 * @return {Query} this
 * @api public
 */

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
 * @param {String} [path]
 * @param {Number} val
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
 * @param {String} [path]
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a `$mod` condition
 *
 * @method mod
 * @memberOf Query
 * @param {String} [path]
 * @param {Number} val
 * @return {Query} this
 * @see $mod http://docs.mongodb.org/manual/reference/operator/mod/
 * @api public
 */

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
 * ####Example
 *
 *     // include a and b, exclude other fields
 *     query.select('a b');
 *
 *     // exclude c and d, include other fields
 *     query.select('-c -d');
 *
 *     // or you may use object notation, useful when
 *     // you have keys already prefixed with a "-"
 *     query.select({ a: 1, b: 1 });
 *     query.select({ c: 0, d: 0 });
 *
 *     // force inclusion of field excluded at schema level
 *     query.select('+path')
 *
 * ####NOTE:
 *
 * Cannot be used with `distinct()`.
 *
 * _v2 had slightly different syntax such as allowing arrays of field names. This support was removed in v3._
 *
 * @method select
 * @memberOf Query
 * @param {Object|String} arg
 * @return {Query} this
 * @see SchemaType
 * @api public
 */

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
 * @param {String} pref one of the listed preference options or aliases
 * @param {Array} [tags] optional tags for this query
 * @see mongodb http://docs.mongodb.org/manual/applications/replication/#read-preference
 * @see driver http://mongodb.github.com/node-mongodb-native/driver-articles/anintroductionto1_1and2_2.html#read-preferences
 * @return {Query} this
 * @api public
 */

Query.prototype.read = function read(pref, tags) {
  // first cast into a ReadPreference object to support tags
  var read = readPref.call(readPref, pref, tags);
  return Query.base.read.call(this, read);
};

/**
 * Merges another Query or conditions object into this one.
 *
 * When a Query is passed, conditions, field selection and options are merged.
 *
 * New in 3.7.0
 *
 * @method merge
 * @memberOf Query
 * @param {Query|Object} source
 * @return {Query} this
 */

/**
 * Sets query options.
 *
 * ####Options:
 *
 * - [tailable](http://www.mongodb.org/display/DOCS/Tailable+Cursors) *
 * - [sort](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsort(\)%7D%7D) *
 * - [limit](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Blimit%28%29%7D%7D) *
 * - [skip](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bskip%28%29%7D%7D) *
 * - [maxscan](https://docs.mongodb.org/v3.2/reference/operator/meta/maxScan/#metaOp._S_maxScan) *
 * - [batchSize](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7BbatchSize%28%29%7D%7D) *
 * - [comment](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24comment) *
 * - [snapshot](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsnapshot%28%29%7D%7D) *
 * - [hint](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24hint) *
 * - [readPreference](http://docs.mongodb.org/manual/applications/replication/#read-preference) **
 * - [lean](./api.html#query_Query-lean) *
 * - [safe](http://www.mongodb.org/display/DOCS/getLastError+Command)
 *
 * _* denotes a query helper method is also available_
 * _** query helper method to set `readPreference` is `read()`_
 *
 * @param {Object} options
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

  if (!(options && options.constructor.name === 'Object')) {
    return this;
  }

  if (options && Array.isArray(options.populate)) {
    var populate = options.populate;
    delete options.populate;
    var _numPopulate = populate.length;
    for (var i = 0; i < _numPopulate; ++i) {
      this.populate(populate[i]);
    }
  }

  return Query.base.setOptions.call(this, options);
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
 * Returns fields selection for this query.
 *
 * @method _fieldsForExec
 * @return {Object}
 * @api private
 * @receiver Query
 */

/**
 * Return an update document with corrected $set operations.
 *
 * @method _updateForExec
 * @api private
 * @receiver Query
 */

Query.prototype._updateForExec = function() {
  var update = utils.clone(this._update, {
    retainKeyOrder: true,
    transform: false,
    depopulate: true
  });
  var ops = Object.keys(update);
  var i = ops.length;
  var ret = {};

  while (i--) {
    var op = ops[i];

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
  var options = Query.base._optionsForExec.call(this);

  delete options.populate;
  delete options.retainKeyOrder;
  model = model || this.model;

  if (!model) {
    return options;
  }

  if (!('safe' in options) && model.schema.options.safe) {
    options.safe = model.schema.options.safe;
  }

  if (!('readPreference' in options) && model.schema.options.read) {
    options.readPreference = model.schema.options.read;
  }

  return options;
};

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
 * @param {Boolean} bool defaults to true
 * @return {Query} this
 * @api public
 */

Query.prototype.lean = function(v) {
  this._mongooseOptions.lean = arguments.length ? !!v : true;
  return this;
};

/**
 * Getter/setter around the current mongoose-specific options for this query
 * (populate, lean, etc.)
 *
 * @param {Object} options if specified, overwrites the current options
 * @returns {Object} the options
 * @api public
 */

Query.prototype.mongooseOptions = function(v) {
  if (arguments.length > 0) {
    this._mongooseOptions = v;
  }
  return this._mongooseOptions;
};

/**
 * Thunk around find()
 *
 * @param {Function} [callback]
 * @return {Query} this
 * @api private
 */
Query.prototype._find = function(callback) {
  if (this._castError) {
    callback(this._castError);
    return this;
  }

  this._applyPaths();
  this._fields = this._castFields(this._fields);

  var fields = this._fieldsForExec();
  var options = this._mongooseOptions;
  var _this = this;

  var cb = function(err, docs) {
    if (err) {
      return callback(err);
    }

    if (docs.length === 0) {
      return callback(null, docs);
    }

    if (!options.populate) {
      return options.lean === true
          ? callback(null, docs)
          : completeMany(_this.model, docs, fields, null, callback);
    }

    var pop = helpers.preparePopulationOptionsMQ(_this, options);
    pop.__noPromise = true;
    _this.model.populate(docs, pop, function(err, docs) {
      if (err) return callback(err);
      return options.lean === true
          ? callback(null, docs)
          : completeMany(_this.model, docs, fields, pop, callback);
    });
  };

  return Query.base.find.call(this, {}, cb);
};

/**
 * Finds documents.
 *
 * When no `callback` is passed, the query is not executed. When the query is executed, the result will be an array of documents.
 *
 * ####Example
 *
 *     query.find({ name: 'Los Pollos Hermanos' }).find(callback)
 *
 * @param {Object} [criteria] mongodb selector
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
  }

  prepareDiscriminatorCriteria(this);

  try {
    this.cast(this.model);
    this._castError = null;
  } catch (err) {
    this._castError = err;
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

  var opts = { retainKeyOrder: this.options.retainKeyOrder, overwrite: true };

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

/*!
 * hydrates many documents
 *
 * @param {Model} model
 * @param {Array} docs
 * @param {Object} fields
 * @param {Query} self
 * @param {Array} [pop] array of paths used in population
 * @param {Function} callback
 */

function completeMany(model, docs, fields, pop, callback) {
  var arr = [];
  var count = docs.length;
  var len = count;
  var opts = pop ?
  {populated: pop}
      : undefined;
  function init(err) {
    if (err) return callback(err);
    --count || callback(null, arr);
  }
  for (var i = 0; i < len; ++i) {
    arr[i] = helpers.createModel(model, docs[i], fields);
    arr[i].init(docs[i], opts, init);
  }
}

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
 * Thunk around findOne()
 *
 * @param {Function} [callback]
 * @see findOne http://docs.mongodb.org/manual/reference/method/db.collection.findOne/
 * @api private
 */

Query.prototype._findOne = function(callback) {
  if (this._castError) {
    return callback(this._castError);
  }

  this._applyPaths();
  this._fields = this._castFields(this._fields);

  var options = this._mongooseOptions;
  var projection = this._fieldsForExec();
  var _this = this;

  // don't pass in the conditions because we already merged them in
  Query.base.findOne.call(_this, {}, function(err, doc) {
    if (err) {
      return callback(err);
    }
    if (!doc) {
      return callback(null, null);
    }

    if (!options.populate) {
      return options.lean === true
          ? callback(null, doc)
          : completeOne(_this.model, doc, null, projection, null, callback);
    }

    var pop = helpers.preparePopulationOptionsMQ(_this, options);
    pop.__noPromise = true;
    _this.model.populate(doc, pop, function(err, doc) {
      if (err) {
        return callback(err);
      }
      return options.lean === true
          ? callback(null, doc)
          : completeOne(_this.model, doc, null, projection, pop, callback);
    });
  });
};

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
 * @param {Object|Query} [criteria] mongodb selector
 * @param {Object} [projection] optional fields to return
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
  } else if (conditions != null) {
    throw new Error('Invalid argument to findOne(): ' +
      util.inspect(conditions));
  }

  prepareDiscriminatorCriteria(this);

  try {
    this.cast(this.model);
    this._castError = null;
  } catch (err) {
    this._castError = err;
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

Query.prototype._count = function(callback) {
  try {
    this.cast(this.model);
  } catch (err) {
    process.nextTick(function() {
      callback(err);
    });
    return this;
  }

  var conds = this._conditions;
  var options = this._optionsForExec();

  this._collection.count(conds, options, utils.tick(callback));
};

/**
 * Specifying this query as a `count` query.
 *
 * Passing a `callback` executes the query.
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
 * @param {Object} [criteria] mongodb selector
 * @param {Function} [callback] optional params are (error, count)
 * @return {Query} this
 * @see count http://docs.mongodb.org/manual/reference/method/db.collection.count/
 * @api public
 */

Query.prototype.count = function(conditions, callback) {
  if (typeof conditions === 'function') {
    callback = conditions;
    conditions = undefined;
  }

  if (mquery.canMerge(conditions)) {
    this.merge(conditions);
  }

  this.op = 'count';
  if (!callback) {
    return this;
  }

  this._count(callback);

  return this;
};

/**
 * Declares or executes a distict() operation.
 *
 * Passing a `callback` executes the query.
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
 * @param {Object|Query} [criteria]
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
  }

  try {
    this.cast(this.model);
  } catch (err) {
    if (!callback) {
      throw err;
    }
    callback(err);
    return this;
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
 * @param {Object|Query} [criteria] mongodb selector
 * @param {Function} [callback] optional params are (error, writeOpResult)
 * @return {Query} this
 * @see writeOpResult http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~WriteOpResult
 * @see remove http://docs.mongodb.org/manual/reference/method/db.collection.remove/
 * @api public
 */

Query.prototype.remove = function(cond, callback) {
  if (typeof cond === 'function') {
    callback = cond;
    cond = null;
  }

  var cb = typeof callback === 'function';

  try {
    this.cast(this.model);
  } catch (err) {
    if (cb) return process.nextTick(callback.bind(null, err));
    return this;
  }

  return Query.base.remove.call(this, cond, callback);
};

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

function completeOne(model, doc, res, fields, pop, callback) {
  var opts = pop ?
  {populated: pop}
      : undefined;

  var casted = helpers.createModel(model, doc, fields);
  casted.init(doc, opts, function(err) {
    if (err) {
      return callback(err);
    }
    if (res) {
      return callback(null, casted, decorateResult(res));
    }
    callback(null, casted);
  });
}

/*!
 * If the model is a discriminator type and not root, then add the key & value to the criteria.
 */

function prepareDiscriminatorCriteria(query) {
  if (!query || !query.model || !query.model.schema) {
    return;
  }

  var schema = query.model.schema;

  if (schema && schema.discriminatorMapping && !schema.discriminatorMapping.isRoot) {
    query._conditions[schema.discriminatorMapping.key] = schema.discriminatorMapping.value;
  }
}

/**
 * Issues a mongodb [findAndModify](http://www.mongodb.org/display/DOCS/findAndModify+Command) update command.
 *
 * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback. The query executes immediately if `callback` is passed.
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
 * - `passRawResult`: if true, passes the [raw result from the MongoDB driver as the third callback parameter](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
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
 * @param {Object|Query} [query]
 * @param {Object} [doc]
 * @param {Object} [options]
 * @param {Function} [callback] optional params are (error, doc), _unless_ `passRawResult` is used, in which case params are (error, doc, writeOpResult)
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
    options = utils.clone(options, { retainKeyOrder: true });
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

  return this._findOneAndUpdate(callback);
};

/*!
 * Thunk around findOneAndUpdate()
 *
 * @param {Function} [callback]
 * @api private
 */

Query.prototype._findOneAndUpdate = function(callback) {
  this._findAndModify('update', callback);
  return this;
};

/**
 * Issues a mongodb [findAndModify](http://www.mongodb.org/display/DOCS/findAndModify+Command) remove command.
 *
 * Finds a matching document, removes it, passing the found document (if any) to the callback. Executes immediately if `callback` is passed.
 *
 * ####Available options
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 * - `maxTimeMS`: puts a time limit on the query - requires mongodb >= 2.6.0
 * - `passRawResult`: if true, passes the [raw result from the MongoDB driver as the third callback parameter](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
 *
 * ####Callback Signature
 *     function(error, doc, result) {
 *       // error: any errors that occurred
 *       // doc: the document before updates are applied if `new: false`, or after updates if `new = true`
 *       // result: [raw result from the MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findAndModify)
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
 * @param {Object} [conditions]
 * @param {Object} [options]
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

/*!
 * Thunk around findOneAndRemove()
 *
 * @param {Function} [callback]
 * @return {Query} this
 * @api private
 */
Query.prototype._findOneAndRemove = function(callback) {
  Query.base.findOneAndRemove.call(this, callback);
};

/*!
 * ignore
 */

function decorateResult(res) {
  if (res) {
    res._kareemIgnore = true;
  }
  return res;
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

  var model = this.model;
  var schema = model.schema;
  var _this = this;
  var castedQuery;
  var castedDoc;
  var fields;
  var opts;
  var doValidate;

  castedQuery = castQuery(this);
  if (castedQuery instanceof Error) {
    return callback(castedQuery);
  }

  opts = this._optionsForExec(model);

  if ('strict' in opts) {
    this._mongooseOptions.strict = opts.strict;
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

    castedDoc = castDoc(this, opts.overwrite);
    castedDoc = setDefaultsOnInsert(this, schema, castedDoc, opts);
    if (!castedDoc) {
      if (opts.upsert) {
        // still need to do the upsert to empty doc
        var doc = utils.clone(castedQuery);
        delete doc._id;
        castedDoc = {$set: doc};
      } else {
        return this.findOne(callback);
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

  this._applyPaths();

  var options = this._mongooseOptions;

  if (this._fields) {
    fields = utils.clone(this._fields);
    opts.fields = this._castFields(fields);
    if (opts.fields instanceof Error) {
      return callback(opts.fields);
    }
  }

  if (opts.sort) convertSortToArray(opts);

  var cb = function(err, doc, res) {
    if (err) {
      return callback(err);
    }

    if (!doc || (utils.isObject(doc) && Object.keys(doc).length === 0)) {
      if (opts.passRawResult) {
        return callback(null, null, decorateResult(res));
      }
      return callback(null, null);
    }

    if (!opts.passRawResult) {
      res = null;
    }

    if (!options.populate) {
      return options.lean === true
          ? (opts.passRawResult ? callback(null, doc, decorateResult(res)) : callback(null, doc))
          : completeOne(_this.model, doc, res, fields, null, callback);
    }

    var pop = helpers.preparePopulationOptionsMQ(_this, options);
    pop.__noPromise = true;
    _this.model.populate(doc, pop, function(err, doc) {
      if (err) {
        return callback(err);
      }

      return options.lean === true
          ? (opts.passRawResult ? callback(null, doc, decorateResult(res)) : callback(null, doc))
          : completeOne(_this.model, doc, res, fields, pop, callback);
    });
  };

  if (opts.runValidators && doValidate) {
    var _callback = function(error) {
      if (error) {
        return callback(error);
      }
      _this._collection.findAndModify(castedQuery, castedDoc, opts, utils.tick(function(error, res) {
        return cb(error, res ? res.value : res, res);
      }));
    };

    try {
      doValidate(_callback);
    } catch (error) {
      callback(error);
    }
  } else {
    this._collection.findAndModify(castedQuery, castedDoc, opts, utils.tick(function(error, res) {
      return cb(error, res ? res.value : res, res);
    }));
  }

  return this;
};

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

  var sort = [];

  for (var key in opts.sort) {
    if (utils.object.hasOwnProperty(opts.sort, key)) {
      sort.push([key, opts.sort[key]]);
    }
  }

  opts.sort = sort;
}

/*!
 * Internal thunk for .update()
 *
 * @param {Function} callback
 * @see Model.update #model_Model.update
 * @api private
 */
Query.prototype._execUpdate = function(callback) {
  var schema = this.model.schema;
  var doValidate;
  var _this;

  var castedQuery = this._conditions;
  var castedDoc = this._update;
  var options = this.options;

  if (this._castError) {
    callback(this._castError);
    return this;
  }

  if (this.options.runValidators) {
    _this = this;
    doValidate = updateValidators(this, schema, castedDoc, options);
    var _callback = function(err) {
      if (err) {
        return callback(err);
      }

      Query.base.update.call(_this, castedQuery, castedDoc, options, callback);
    };
    try {
      doValidate(_callback);
    } catch (err) {
      process.nextTick(function() {
        callback(err);
      });
    }
    return this;
  }

  Query.base.update.call(this, castedQuery, castedDoc, options, callback);
  return this;
};

/*!
 * Internal thunk for .updateMany()
 *
 * @param {Function} callback
 * @see Model.update #model_Model.update
 * @api private
 */
Query.prototype._updateMany = function(callback) {
  var schema = this.model.schema;
  var doValidate;
  var _this;

  var castedQuery = this._conditions;
  var castedDoc = this._update;
  var options = this.options;

  if (this._castError) {
    callback(this._castError);
    return this;
  }

  if (this.options.runValidators) {
    _this = this;
    doValidate = updateValidators(this, schema, castedDoc, options);
    var _callback = function(err) {
      if (err) {
        return callback(err);
      }

      Query.base.updateMany.call(_this, castedQuery, castedDoc, options, callback);
    };
    try {
      doValidate(_callback);
    } catch (err) {
      process.nextTick(function() {
        callback(err);
      });
    }
    return this;
  }

  Query.base.updateMany.call(this, castedQuery, castedDoc, options, callback);
  return this;
};

/*!
 * Internal thunk for .updateOne()
 *
 * @param {Function} callback
 * @see Model.update #model_Model.update
 * @api private
 */
Query.prototype._updateOne = function(callback) {
  var schema = this.model.schema;
  var doValidate;
  var _this;

  var castedQuery = this._conditions;
  var castedDoc = this._update;
  var options = this.options;

  if (this._castError) {
    callback(this._castError);
    return this;
  }

  if (this.options.runValidators) {
    _this = this;
    doValidate = updateValidators(this, schema, castedDoc, options);
    var _callback = function(err) {
      if (err) {
        return callback(err);
      }

      Query.base.updateOne.call(_this, castedQuery, castedDoc, options, callback);
    };
    try {
      doValidate(_callback);
    } catch (err) {
      process.nextTick(function() {
        callback(err);
      });
    }
    return this;
  }

  Query.base.updateOne.call(this, castedQuery, castedDoc, options, callback);
  return this;
};

/**
 * Declare and/or execute this query as an update() operation.
 *
 * _All paths passed that are not $atomic operations will become $set ops._
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
 *  - `safe` (boolean) safe mode (defaults to value set in schema (true))
 *  - `upsert` (boolean) whether to create the doc if it doesn't match (false)
 *  - `multi` (boolean) whether multiple documents should be updated (false)
 *  - `runValidators`: if true, runs [update validators](/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema.
 *  - `setDefaultsOnInsert`: if this and `upsert` are true, mongoose will apply the [defaults](http://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created. This option only works on MongoDB >= 2.4 because it relies on [MongoDB's `$setOnInsert` operator](https://docs.mongodb.org/v2.4/reference/operator/update/setOnInsert/).
 *  - `strict` (boolean) overrides the `strict` option for this update
 *  - `overwrite` (boolean) disables update-only mode, allowing you to overwrite the doc (false)
 *  - `context` (string) if set to 'query' and `runValidators` is on, `this` will refer to the query in custom validator functions that update validation runs. Does nothing if `runValidators` is false.
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
 * `update()`, except MongoDB will update _only_ the first document that
 * matches `criteria` regardless of the value of the `multi` option.
 *
 * **Note** updateOne will _not_ fire update middleware. Use `pre('updateOne')`
 * and `post('updateOne')` instead.
 *
 * @param {Object} [criteria]
 * @param {Object} [doc] the update command
 * @param {Object} [options]
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

/*!
 * Internal helper for update, updateMany, updateOne
 */

function _update(query, op, conditions, doc, options, callback) {
  // make sure we don't send in the whole Document to merge()
  query.op = op;
  conditions = utils.toObject(conditions);

  var oldCb = callback;
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

  // if doc is undefined at this point, this means this function is being
  // executed by exec(not always see below). Grab the update doc from here in
  // order to validate
  // This could also be somebody calling update() or update({}). Probably not a
  // common use case, check for _update to make sure we don't do anything bad
  if (!doc && query._update) {
    doc = query._updateForExec();
  }

  if (mquery.canMerge(conditions)) {
    query.merge(conditions);
  }

  // validate the selector part of the query
  var castedQuery = castQuery(query);
  if (castedQuery instanceof Error) {
    query._castError = castedQuery;
    if (callback) {
      callback(castedQuery);
      return query;
    } else if (!options || !options.dontThrowCastError) {
      throw castedQuery;
    }
  }

  // validate the update part of the query
  var castedDoc;
  try {
    var $options = {retainKeyOrder: true};
    if (options && options.minimize) {
      $options.minimize = true;
    }
    castedDoc = query._castUpdate(utils.clone(doc, $options),
        options && options.overwrite);
  } catch (err) {
    query._castError = castedQuery;
    if (callback) {
      callback(err);
      return query;
    } else if (!options || !options.dontThrowCastError) {
      throw err;
    }
  }

  castedDoc = setDefaultsOnInsert(query, query.schema, castedDoc, options);
  if (!castedDoc) {
    // Make sure promises know that this is still an update, see gh-2796
    query.op = op;
    callback && callback(null);
    return query;
  }

  if (utils.isObject(options)) {
    query.setOptions(options);
  }

  if (!query._update) {
    query._update = castedDoc;
  }

  // Hooks
  if (callback) {
    if (op === 'update') {
      return query._execUpdate(callback);
    }
    return query['_' + op](callback);
  }

  return Query.base[op].call(query, castedQuery, castedDoc, options, callback);
}

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
  var Promise = PromiseProvider.get();
  var _this = this;

  if (typeof op === 'function') {
    callback = op;
    op = null;
  } else if (typeof op === 'string') {
    this.op = op;
  }

  var _results;
  var promise = new Promise.ES6(function(resolve, reject) {
    if (!_this.op) {
      resolve();
      return;
    }

    _this[_this.op].call(_this, function(error, res) {
      if (error) {
        reject(error);
        return;
      }
      _results = arguments;
      resolve(res);
    });
  });

  if (callback) {
    promise.then(
      function() {
        callback.apply(null, _results);
        return null;
      },
      function(error) {
        callback(error);
      }).
      catch(function(error) {
        // If we made it here, we must have an error in the callback re:
        // gh-4500, so we need to emit.
        setImmediate(function() {
          _this.model.emit('error', error);
        });
      });
  }

  return promise;
};

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

/**
 * Finds the schema for `path`. This is different than
 * calling `schema.path` as it also resolves paths with
 * positional selectors (something.$.another.$.path).
 *
 * @param {String} path
 * @api private
 */

Query.prototype._getSchema = function _getSchema(path) {
  return this.model._getSchema(path);
};

/*!
 * These operators require casting docs
 * to real Documents for Update operations.
 */

var castOps = {
  $push: 1,
  $pushAll: 1,
  $addToSet: 1,
  $set: 1
};

/*!
 * These operators should be cast to numbers instead
 * of their path schema type.
 */

var numberOps = {
  $pop: 1,
  $unset: 1,
  $inc: 1
};

/*!
 * Casts obj for an update command.
 *
 * @param {Object} obj
 * @return {Object} obj after casting its values
 * @api private
 */

Query.prototype._castUpdate = function _castUpdate(obj, overwrite) {
  if (!obj) {
    return undefined;
  }

  var ops = Object.keys(obj);
  var i = ops.length;
  var ret = {};
  var hasKeys;
  var val;
  var hasDollarKey = false;

  while (i--) {
    var op = ops[i];
    // if overwrite is set, don't do any of the special $set stuff
    if (op[0] !== '$' && !overwrite) {
      // fix up $set sugar
      if (!ret.$set) {
        if (obj.$set) {
          ret.$set = obj.$set;
        } else {
          ret.$set = {};
        }
      }
      ret.$set[op] = obj[op];
      ops.splice(i, 1);
      if (!~ops.indexOf('$set')) ops.push('$set');
    } else if (op === '$set') {
      if (!ret.$set) {
        ret[op] = obj[op];
      }
    } else {
      ret[op] = obj[op];
    }
  }

  // cast each value
  i = ops.length;

  // if we get passed {} for the update, we still need to respect that when it
  // is an overwrite scenario
  if (overwrite) {
    hasKeys = true;
  }

  while (i--) {
    op = ops[i];
    val = ret[op];
    hasDollarKey = hasDollarKey || op.charAt(0) === '$';
    if (val &&
        typeof val === 'object' &&
        (!overwrite || hasDollarKey)) {
      hasKeys |= this._walkUpdatePath(val, op);
    } else if (overwrite && ret && typeof ret === 'object') {
      // if we are just using overwrite, cast the query and then we will
      // *always* return the value, even if it is an empty object. We need to
      // set hasKeys above because we need to account for the case where the
      // user passes {} and wants to clobber the whole document
      // Also, _walkUpdatePath expects an operation, so give it $set since that
      // is basically what we're doing
      this._walkUpdatePath(ret, '$set');
    } else {
      var msg = 'Invalid atomic update value for ' + op + '. '
          + 'Expected an object, received ' + typeof val;
      throw new Error(msg);
    }
  }

  return hasKeys && ret;
};

/**
 * Walk each path of obj and cast its values
 * according to its schema.
 *
 * @param {Object} obj - part of a query
 * @param {String} op - the atomic operator ($pull, $set, etc)
 * @param {String} pref - path prefix (internal only)
 * @return {Bool} true if this path has keys to update
 * @api private
 */

Query.prototype._walkUpdatePath = function _walkUpdatePath(obj, op, pref) {
  var prefix = pref ? pref + '.' : '',
      keys = Object.keys(obj),
      i = keys.length,
      hasKeys = false,
      schema,
      key,
      val;

  var useNestedStrict = this.schema.options.useNestedStrict;

  while (i--) {
    key = keys[i];
    val = obj[key];

    if (val && val.constructor.name === 'Object') {
      // watch for embedded doc schemas
      schema = this._getSchema(prefix + key);
      if (schema && schema.caster && op in castOps) {
        // embedded doc schema
        hasKeys = true;

        if ('$each' in val) {
          obj[key] = {
            $each: this._castUpdateVal(schema, val.$each, op)
          };

          if (val.$slice != null) {
            obj[key].$slice = val.$slice | 0;
          }

          if (val.$sort) {
            obj[key].$sort = val.$sort;
          }

          if (!!val.$position || val.$position === 0) {
            obj[key].$position = val.$position;
          }
        } else {
          obj[key] = this._castUpdateVal(schema, val, op);
        }
      } else if (op === '$currentDate') {
        // $currentDate can take an object
        obj[key] = this._castUpdateVal(schema, val, op);
        hasKeys = true;
      } else if (op === '$set' && schema) {
        obj[key] = this._castUpdateVal(schema, val, op);
        hasKeys = true;
      } else {
        var pathToCheck = (prefix + key);
        var v = this.model.schema._getPathType(pathToCheck);
        var _strict = 'strict' in this._mongooseOptions ?
          this._mongooseOptions.strict :
          ((useNestedStrict && v.schema) || this.schema).options.strict;
        if (v.pathType === 'undefined') {
          if (_strict === 'throw') {
            throw new StrictModeError(pathToCheck);
          } else if (_strict) {
            delete obj[key];
            continue;
          }
        }

        // gh-2314
        // we should be able to set a schema-less field
        // to an empty object literal
        hasKeys |= this._walkUpdatePath(val, op, prefix + key) ||
            (utils.isObject(val) && Object.keys(val).length === 0);
      }
    } else {
      var checkPath = (key === '$each' || key === '$or' || key === '$and') ?
        pref : prefix + key;
      schema = this._getSchema(checkPath);

      var pathDetails = this.model.schema._getPathType(checkPath);
      var isStrict = 'strict' in this._mongooseOptions ?
        this._mongooseOptions.strict :
        ((useNestedStrict && pathDetails.schema) || this.schema).options.strict;

      var skip = isStrict &&
          !schema &&
          !/real|nested/.test(pathDetails.pathType);

      if (skip) {
        if (isStrict === 'throw') {
          throw new StrictModeError(prefix + key);
        } else {
          delete obj[key];
        }
      } else {
        // gh-1845 temporary fix: ignore $rename. See gh-3027 for tracking
        // improving this.
        if (op === '$rename') {
          hasKeys = true;
          continue;
        }

        hasKeys = true;
        obj[key] = this._castUpdateVal(schema, val, op, key);
      }
    }
  }
  return hasKeys;
};

/**
 * Casts `val` according to `schema` and atomic `op`.
 *
 * @param {Schema} schema
 * @param {Object} val
 * @param {String} op - the atomic operator ($pull, $set, etc)
 * @param {String} [$conditional]
 * @api private
 */

Query.prototype._castUpdateVal = function _castUpdateVal(schema, val, op, $conditional) {
  if (!schema) {
    // non-existing schema path
    return op in numberOps
        ? Number(val)
        : val;
  }

  var cond = schema.caster && op in castOps &&
      (utils.isObject(val) || Array.isArray(val));
  if (cond) {
    // Cast values for ops that add data to MongoDB.
    // Ensures embedded documents get ObjectIds etc.
    var tmp = schema.cast(val);
    if (Array.isArray(val)) {
      val = tmp;
    } else if (Array.isArray(tmp)) {
      val = tmp[0];
    } else {
      val = tmp;
    }
  }

  if (op in numberOps) {
    if (op === '$inc') {
      return schema.castForQuery(val);
    }
    return Number(val);
  }
  if (op === '$currentDate') {
    if (typeof val === 'object') {
      return {$type: val.$type};
    }
    return Boolean(val);
  }
  if (/^\$/.test($conditional)) {
    return schema.castForQuery($conditional, val);
  }

  return schema.castForQuery(val);
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

  var res = utils.populate.apply(null, arguments);
  var opts = this._mongooseOptions;

  if (!utils.isObject(opts.populate)) {
    opts.populate = {};
  }

  var pop = opts.populate;

  for (var i = 0; i < res.length; ++i) {
    var path = res[i].path;
    if (pop[path] && pop[path].populate && res[i].populate) {
      res[i].populate = pop[path].populate.concat(res[i].populate);
    }
    pop[res[i].path] = res[i];
  }

  return this;
};

/**
 * Casts this query to the schema of `model`
 *
 * ####Note
 *
 * If `obj` is present, it is cast instead of this query.
 *
 * @param {Model} model
 * @param {Object} [obj]
 * @return {Object}
 * @api public
 */

Query.prototype.cast = function(model, obj) {
  obj || (obj = this._conditions);

  try {
    return cast(model.schema, obj, {
      upsert: this.options && this.options.upsert,
      strict: (this.options && this.options.strict) ||
        (model.schema.options && model.schema.options.strict)
    });
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
  var selected,
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
};

/**
 * Returns a Node.js 0.8 style [read stream](http://nodejs.org/docs/v0.8.21/api/stream.html#stream_readable_stream) interface.
 *
 * ####Example
 *
 *     // follows the nodejs 0.8 stream api
 *     Thing.find({ name: /^hello/ }).stream().pipe(res)
 *
 *     // manual streaming
 *     var stream = Thing.find({ name: /^hello/ }).stream();
 *
 *     stream.on('data', function (doc) {
 *       // do something with the mongoose document
 *     }).on('error', function (err) {
 *       // handle the error
 *     }).on('close', function () {
 *       // the stream is closed
 *     });
 *
 * ####Valid options
 *
 *   - `transform`: optional function which accepts a mongoose document. The return value of the function will be emitted on `data`.
 *
 * ####Example
 *
 *     // JSON.stringify all documents before emitting
 *     var stream = Thing.find().stream({ transform: JSON.stringify });
 *     stream.pipe(writeStream);
 *
 * @return {QueryStream}
 * @param {Object} [options]
 * @see QueryStream
 * @api public
 */

Query.prototype.stream = function stream(opts) {
  this._applyPaths();
  this._fields = this._castFields(this._fields);
  return new QueryStream(this, opts);
};
Query.prototype.stream = util.deprecate(Query.prototype.stream, 'Mongoose: ' +
  'Query.prototype.stream() is deprecated in mongoose >= 4.5.0, ' +
  'use Query.prototype.cursor() instead');

/**
 * Returns a wrapper around a [mongodb driver cursor](http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html).
 * A QueryCursor exposes a [Streams3](https://strongloop.com/strongblog/whats-new-io-js-beta-streams3/)-compatible
 * interface, as well as a `.next()` function.
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
  this.setOptions({ fields: this._fieldsForExec() });
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
    for (var key in opts) {
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
  var params = [];
  var sphere = this._mongooseOptions.nearSphere;

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
 * Specifies a $polygon condition
 *
 * ####Example
 *
 *     query.where('loc').within().polygon([10,20], [13, 25], [7,15])
 *     query.polygon('loc', [10,20], [13, 25], [7,15])
 *
 * @method polygon
 * @memberOf Query
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
 * @return {Boolean}
 * @api public
 */

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
 * @return {Boolean}
 * @api public
 */

/*!
 * Export
 */

module.exports = Query;
