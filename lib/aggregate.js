'use strict';

/*!
 * Module dependencies
 */

const AggregationCursor = require('./cursor/AggregationCursor');
const Query = require('./query');
const applyGlobalMaxTimeMS = require('./helpers/query/applyGlobalMaxTimeMS');
const util = require('util');
const utils = require('./utils');
const read = Query.prototype.read;
const readConcern = Query.prototype.readConcern;

/**
 * Aggregate constructor used for building aggregation pipelines. Do not
 * instantiate this class directly, use [Model.aggregate()](/docs/api.html#model_Model.aggregate) instead.
 *
 * ####Example:
 *
 *     const aggregate = Model.aggregate([
 *       { $project: { a: 1, b: 1 } },
 *       { $skip: 5 }
 *     ]);
 *
 *     Model.
 *       aggregate([{ $match: { age: { $gte: 21 }}}]).
 *       unwind('tags').
 *       exec(callback);
 *
 * ####Note:
 *
 * - The documents returned are plain javascript objects, not mongoose documents (since any shape of document can be returned).
 * - Mongoose does **not** cast pipeline stages. The below will **not** work unless `_id` is a string in the database
 *
 * ```javascript
 *   new Aggregate([{ $match: { _id: '00000000000000000000000a' } }]);
 *   // Do this instead to cast to an ObjectId
 *   new Aggregate([{ $match: { _id: mongoose.Types.ObjectId('00000000000000000000000a') } }]);
 * ```
 *
 * @see MongoDB http://docs.mongodb.org/manual/applications/aggregation/
 * @see driver http://mongodb.github.com/node-mongodb-native/api-generated/collection.html#aggregate
 * @param {Array} [pipeline] aggregation pipeline as an array of objects
 * @api public
 */

function Aggregate(pipeline) {
  this._pipeline = [];
  this._model = undefined;
  this.options = {};

  if (arguments.length === 1 && util.isArray(pipeline)) {
    this.append.apply(this, pipeline);
  }
}

/**
 * Contains options passed down to the [aggregate command](https://docs.mongodb.com/manual/reference/command/aggregate/).
 * Supported options are:
 *
 * - `readPreference`
 * - [`cursor`](./api.html#aggregate_Aggregate-cursor)
 * - [`explain`](./api.html#aggregate_Aggregate-explain)
 * - [`allowDiskUse`](./api.html#aggregate_Aggregate-allowDiskUse)
 * - `maxTimeMS`
 * - `bypassDocumentValidation`
 * - `raw`
 * - `promoteLongs`
 * - `promoteValues`
 * - `promoteBuffers`
 * - [`collation`](./api.html#aggregate_Aggregate-collation)
 * - `comment`
 * - [`session`](./api.html#aggregate_Aggregate-session)
 *
 * @property options
 * @memberOf Aggregate
 * @api public
 */

Aggregate.prototype.options;

/**
 * Get/set the model that this aggregation will execute on.
 *
 * ####Example:
 *     const aggregate = MyModel.aggregate([{ $match: { answer: 42 } }]);
 *     aggregate.model() === MyModel; // true
 *
 *     // Change the model. There's rarely any reason to do this.
 *     aggregate.model(SomeOtherModel);
 *     aggregate.model() === SomeOtherModel; // true
 *
 * @param {Model} [model] the model to which the aggregate is to be bound
 * @return {Aggregate|Model} if model is passed, will return `this`, otherwise will return the model
 * @api public
 */

Aggregate.prototype.model = function(model) {
  if (arguments.length === 0) {
    return this._model;
  }

  this._model = model;
  if (model.schema != null) {
    if (this.options.readPreference == null &&
        model.schema.options.read != null) {
      this.options.readPreference = model.schema.options.read;
    }
    if (this.options.collation == null &&
        model.schema.options.collation != null) {
      this.options.collation = model.schema.options.collation;
    }
  }
  return this;
};

/**
 * Appends new operators to this aggregate pipeline
 *
 * ####Examples:
 *
 *     aggregate.append({ $project: { field: 1 }}, { $limit: 2 });
 *
 *     // or pass an array
 *     var pipeline = [{ $match: { daw: 'Logic Audio X' }} ];
 *     aggregate.append(pipeline);
 *
 * @param {Object} ops operator(s) to append
 * @return {Aggregate}
 * @api public
 */

Aggregate.prototype.append = function() {
  const args = (arguments.length === 1 && util.isArray(arguments[0]))
    ? arguments[0]
    : utils.args(arguments);

  if (!args.every(isOperator)) {
    throw new Error('Arguments must be aggregate pipeline operators');
  }

  this._pipeline = this._pipeline.concat(args);

  return this;
};

/**
 * Appends a new $addFields operator to this aggregate pipeline.
 * Requires MongoDB v3.4+ to work
 *
 * ####Examples:
  *
 *     // adding new fields based on existing fields
 *     aggregate.addFields({
 *         newField: '$b.nested'
 *       , plusTen: { $add: ['$val', 10]}
 *       , sub: {
 *            name: '$a'
 *         }
 *     })
 *
 *     // etc
 *     aggregate.addFields({ salary_k: { $divide: [ "$salary", 1000 ] } });
 *
 * @param {Object} arg field specification
 * @see $addFields https://docs.mongodb.com/manual/reference/operator/aggregation/addFields/
 * @return {Aggregate}
 * @api public
 */
Aggregate.prototype.addFields = function(arg) {
  const fields = {};
  if (typeof arg === 'object' && !util.isArray(arg)) {
    Object.keys(arg).forEach(function(field) {
      fields[field] = arg[field];
    });
  } else {
    throw new Error('Invalid addFields() argument. Must be an object');
  }
  return this.append({$addFields: fields});
};

/**
 * Appends a new $project operator to this aggregate pipeline.
 *
 * Mongoose query [selection syntax](#query_Query-select) is also supported.
 *
 * ####Examples:
 *
 *     // include a, include b, exclude _id
 *     aggregate.project("a b -_id");
 *
 *     // or you may use object notation, useful when
 *     // you have keys already prefixed with a "-"
 *     aggregate.project({a: 1, b: 1, _id: 0});
 *
 *     // reshaping documents
 *     aggregate.project({
 *         newField: '$b.nested'
 *       , plusTen: { $add: ['$val', 10]}
 *       , sub: {
 *            name: '$a'
 *         }
 *     })
 *
 *     // etc
 *     aggregate.project({ salary_k: { $divide: [ "$salary", 1000 ] } });
 *
 * @param {Object|String} arg field specification
 * @see projection http://docs.mongodb.org/manual/reference/aggregation/project/
 * @return {Aggregate}
 * @api public
 */

Aggregate.prototype.project = function(arg) {
  const fields = {};

  if (typeof arg === 'object' && !util.isArray(arg)) {
    Object.keys(arg).forEach(function(field) {
      fields[field] = arg[field];
    });
  } else if (arguments.length === 1 && typeof arg === 'string') {
    arg.split(/\s+/).forEach(function(field) {
      if (!field) {
        return;
      }
      const include = field[0] === '-' ? 0 : 1;
      if (include === 0) {
        field = field.substring(1);
      }
      fields[field] = include;
    });
  } else {
    throw new Error('Invalid project() argument. Must be string or object');
  }

  return this.append({$project: fields});
};

/**
 * Appends a new custom $group operator to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.group({ _id: "$department" });
 *
 * @see $group http://docs.mongodb.org/manual/reference/aggregation/group/
 * @method group
 * @memberOf Aggregate
 * @instance
 * @param {Object} arg $group operator contents
 * @return {Aggregate}
 * @api public
 */

/**
 * Appends a new custom $match operator to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.match({ department: { $in: [ "sales", "engineering" ] } });
 *
 * @see $match http://docs.mongodb.org/manual/reference/aggregation/match/
 * @method match
 * @memberOf Aggregate
 * @instance
 * @param {Object} arg $match operator contents
 * @return {Aggregate}
 * @api public
 */

/**
 * Appends a new $skip operator to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.skip(10);
 *
 * @see $skip http://docs.mongodb.org/manual/reference/aggregation/skip/
 * @method skip
 * @memberOf Aggregate
 * @instance
 * @param {Number} num number of records to skip before next stage
 * @return {Aggregate}
 * @api public
 */

/**
 * Appends a new $limit operator to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.limit(10);
 *
 * @see $limit http://docs.mongodb.org/manual/reference/aggregation/limit/
 * @method limit
 * @memberOf Aggregate
 * @instance
 * @param {Number} num maximum number of records to pass to the next stage
 * @return {Aggregate}
 * @api public
 */

/**
 * Appends a new $geoNear operator to this aggregate pipeline.
 *
 * ####NOTE:
 *
 * **MUST** be used as the first operator in the pipeline.
 *
 * ####Examples:
 *
 *     aggregate.near({
 *       near: [40.724, -73.997],
 *       distanceField: "dist.calculated", // required
 *       maxDistance: 0.008,
 *       query: { type: "public" },
 *       includeLocs: "dist.location",
 *       uniqueDocs: true,
 *       num: 5
 *     });
 *
 * @see $geoNear http://docs.mongodb.org/manual/reference/aggregation/geoNear/
 * @method near
 * @memberOf Aggregate
 * @instance
 * @param {Object} arg
 * @return {Aggregate}
 * @api public
 */

Aggregate.prototype.near = function(arg) {
  const op = {};
  op.$geoNear = arg;
  return this.append(op);
};

/*!
 * define methods
 */

'group match skip limit out'.split(' ').forEach(function($operator) {
  Aggregate.prototype[$operator] = function(arg) {
    const op = {};
    op['$' + $operator] = arg;
    return this.append(op);
  };
});

/**
 * Appends new custom $unwind operator(s) to this aggregate pipeline.
 *
 * Note that the `$unwind` operator requires the path name to start with '$'.
 * Mongoose will prepend '$' if the specified field doesn't start '$'.
 *
 * ####Examples:
 *
 *     aggregate.unwind("tags");
 *     aggregate.unwind("a", "b", "c");
 *
 * @see $unwind http://docs.mongodb.org/manual/reference/aggregation/unwind/
 * @param {String} fields the field(s) to unwind
 * @return {Aggregate}
 * @api public
 */

Aggregate.prototype.unwind = function() {
  const args = utils.args(arguments);

  const res = [];
  for (let i = 0; i < args.length; ++i) {
    const arg = args[i];
    if (arg && typeof arg === 'object') {
      res.push({ $unwind: arg });
    } else if (typeof arg === 'string') {
      res.push({
        $unwind: (arg && arg.startsWith('$')) ? arg : '$' + arg
      });
    } else {
      throw new Error('Invalid arg "' + arg + '" to unwind(), ' +
        'must be string or object');
    }
  }

  return this.append.apply(this, res);
};

/**
 * Appends a new $replaceRoot operator to this aggregate pipeline.
 *
 * Note that the `$replaceRoot` operator requires field strings to start with '$'.
 * If you are passing in a string Mongoose will prepend '$' if the specified field doesn't start '$'.
 * If you are passing in an object the strings in your expression will not be altered.
 *
 * ####Examples:
 *
 *     aggregate.replaceRoot("user");
 *
 *     aggregate.replaceRoot({ x: { $concat: ['$this', '$that'] } });
 *
 * @see $replaceRoot https://docs.mongodb.org/manual/reference/operator/aggregation/replaceRoot
 * @param {String|Object} the field or document which will become the new root document
 * @return {Aggregate}
 * @api public
 */

Aggregate.prototype.replaceRoot = function(newRoot) {
  let ret;

  if (typeof newRoot === 'string') {
    ret = newRoot.startsWith('$') ? newRoot : '$' + newRoot;
  } else {
    ret = newRoot;
  }

  return this.append({
    $replaceRoot: {
      newRoot: ret
    }
  });
};

/**
 * Appends a new $count operator to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.count("userCount");
 *
 * @see $count https://docs.mongodb.org/manual/reference/operator/aggregation/count
 * @param {String} the name of the count field
 * @return {Aggregate}
 * @api public
 */

Aggregate.prototype.count = function(countName) {
  return this.append({ $count: countName });
};

/**
 * Appends a new $sortByCount operator to this aggregate pipeline. Accepts either a string field name
 * or a pipeline object.
 *
 * Note that the `$sortByCount` operator requires the new root to start with '$'.
 * Mongoose will prepend '$' if the specified field name doesn't start with '$'.
 *
 * ####Examples:
 *
 *     aggregate.sortByCount('users');
 *     aggregate.sortByCount({ $mergeObjects: [ "$employee", "$business" ] })
 *
 * @see $sortByCount https://docs.mongodb.com/manual/reference/operator/aggregation/sortByCount/
 * @param {Object|String} arg
 * @return {Aggregate} this
 * @api public
 */

Aggregate.prototype.sortByCount = function(arg) {
  if (arg && typeof arg === 'object') {
    return this.append({ $sortByCount: arg });
  } else if (typeof arg === 'string') {
    return this.append({
      $sortByCount: (arg && arg.startsWith('$')) ? arg : '$' + arg
    });
  } else {
    throw new TypeError('Invalid arg "' + arg + '" to sortByCount(), ' +
      'must be string or object');
  }
};

/**
 * Appends new custom $lookup operator(s) to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.lookup({ from: 'users', localField: 'userId', foreignField: '_id', as: 'users' });
 *
 * @see $lookup https://docs.mongodb.org/manual/reference/operator/aggregation/lookup/#pipe._S_lookup
 * @param {Object} options to $lookup as described in the above link
 * @return {Aggregate}
 * @api public
 */

Aggregate.prototype.lookup = function(options) {
  return this.append({$lookup: options});
};

/**
 * Appends new custom $graphLookup operator(s) to this aggregate pipeline, performing a recursive search on a collection.
 *
 * Note that graphLookup can only consume at most 100MB of memory, and does not allow disk use even if `{ allowDiskUse: true }` is specified.
 *
 * #### Examples:
 *      // Suppose we have a collection of courses, where a document might look like `{ _id: 0, name: 'Calculus', prerequisite: 'Trigonometry'}` and `{ _id: 0, name: 'Trigonometry', prerequisite: 'Algebra' }`
 *      aggregate.graphLookup({ from: 'courses', startWith: '$prerequisite', connectFromField: 'prerequisite', connectToField: 'name', as: 'prerequisites', maxDepth: 3 }) // this will recursively search the 'courses' collection up to 3 prerequisites
 *
 * @see $graphLookup https://docs.mongodb.com/manual/reference/operator/aggregation/graphLookup/#pipe._S_graphLookup
 * @param {Object} options to $graphLookup as described in the above link
 * @return {Aggregate}
 * @api public
 */

Aggregate.prototype.graphLookup = function(options) {
  const cloneOptions = {};
  if (options) {
    if (!utils.isObject(options)) {
      throw new TypeError('Invalid graphLookup() argument. Must be an object.');
    }

    utils.mergeClone(cloneOptions, options);
    const startWith = cloneOptions.startWith;

    if (startWith && typeof startWith === 'string') {
      cloneOptions.startWith = cloneOptions.startWith.startsWith('$') ?
        cloneOptions.startWith :
        '$' + cloneOptions.startWith;
    }

  }
  return this.append({ $graphLookup: cloneOptions });
};

/**
 * Appends new custom $sample operator(s) to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.sample(3); // Add a pipeline that picks 3 random documents
 *
 * @see $sample https://docs.mongodb.org/manual/reference/operator/aggregation/sample/#pipe._S_sample
 * @param {Number} size number of random documents to pick
 * @return {Aggregate}
 * @api public
 */

Aggregate.prototype.sample = function(size) {
  return this.append({$sample: {size: size}});
};

/**
 * Appends a new $sort operator to this aggregate pipeline.
 *
 * If an object is passed, values allowed are `asc`, `desc`, `ascending`, `descending`, `1`, and `-1`.
 *
 * If a string is passed, it must be a space delimited list of path names. The sort order of each path is ascending unless the path name is prefixed with `-` which will be treated as descending.
 *
 * ####Examples:
 *
 *     // these are equivalent
 *     aggregate.sort({ field: 'asc', test: -1 });
 *     aggregate.sort('field -test');
 *
 * @see $sort http://docs.mongodb.org/manual/reference/aggregation/sort/
 * @param {Object|String} arg
 * @return {Aggregate} this
 * @api public
 */

Aggregate.prototype.sort = function(arg) {
  // TODO refactor to reuse the query builder logic

  const sort = {};

  if (arg.constructor.name === 'Object') {
    const desc = ['desc', 'descending', -1];
    Object.keys(arg).forEach(function(field) {
      // If sorting by text score, skip coercing into 1/-1
      if (arg[field] instanceof Object && arg[field].$meta) {
        sort[field] = arg[field];
        return;
      }
      sort[field] = desc.indexOf(arg[field]) === -1 ? 1 : -1;
    });
  } else if (arguments.length === 1 && typeof arg === 'string') {
    arg.split(/\s+/).forEach(function(field) {
      if (!field) {
        return;
      }
      const ascend = field[0] === '-' ? -1 : 1;
      if (ascend === -1) {
        field = field.substring(1);
      }
      sort[field] = ascend;
    });
  } else {
    throw new TypeError('Invalid sort() argument. Must be a string or object.');
  }

  return this.append({$sort: sort});
};

/**
 * Sets the readPreference option for the aggregation query.
 *
 * ####Example:
 *
 *     Model.aggregate(..).read('primaryPreferred').exec(callback)
 *
 * @param {String} pref one of the listed preference options or their aliases
 * @param {Array} [tags] optional tags for this query
 * @return {Aggregate} this
 * @api public
 * @see mongodb http://docs.mongodb.org/manual/applications/replication/#read-preference
 * @see driver http://mongodb.github.com/node-mongodb-native/driver-articles/anintroductionto1_1and2_2.html#read-preferences
 */

Aggregate.prototype.read = function(pref, tags) {
  if (!this.options) {
    this.options = {};
  }
  read.call(this, pref, tags);
  return this;
};

/**
 * Sets the readConcern level for the aggregation query.
 *
 * ####Example:
 *
 *     Model.aggregate(..).readConcern('majority').exec(callback)
 *
 * @param {String} level one of the listed read concern level or their aliases
 * @see mongodb https://docs.mongodb.com/manual/reference/read-concern/
 * @return {Aggregate} this
 * @api public
 */

Aggregate.prototype.readConcern = function(level) {
  if (!this.options) {
    this.options = {};
  }
  readConcern.call(this, level);
  return this;
};

/**
 * Appends a new $redact operator to this aggregate pipeline.
 *
 * If 3 arguments are supplied, Mongoose will wrap them with if-then-else of $cond operator respectively
 * If `thenExpr` or `elseExpr` is string, make sure it starts with $$, like `$$DESCEND`, `$$PRUNE` or `$$KEEP`.
 *
 * ####Example:
 *
 *     Model.aggregate(...)
 *      .redact({
 *        $cond: {
 *          if: { $eq: [ '$level', 5 ] },
 *          then: '$$PRUNE',
 *          else: '$$DESCEND'
 *        }
 *      })
 *      .exec();
 *
 *     // $redact often comes with $cond operator, you can also use the following syntax provided by mongoose
 *     Model.aggregate(...)
 *      .redact({ $eq: [ '$level', 5 ] }, '$$PRUNE', '$$DESCEND')
 *      .exec();
 *
 * @param {Object} expression redact options or conditional expression
 * @param {String|Object} [thenExpr] true case for the condition
 * @param {String|Object} [elseExpr] false case for the condition
 * @return {Aggregate} this
 * @see $redact https://docs.mongodb.com/manual/reference/operator/aggregation/redact/
 * @api public
 */

Aggregate.prototype.redact = function(expression, thenExpr, elseExpr) {
  if (arguments.length === 3) {
    if ((typeof thenExpr === 'string' && !thenExpr.startsWith('$$')) ||
        (typeof elseExpr === 'string' && !elseExpr.startsWith('$$'))) {
      throw new Error('If thenExpr or elseExpr is string, it must start with $$. e.g. $$DESCEND, $$PRUNE, $$KEEP');
    }

    expression = {
      $cond: {
        if: expression,
        then: thenExpr,
        else: elseExpr
      }
    };
  } else if (arguments.length !== 1) {
    throw new TypeError('Invalid arguments');
  }

  return this.append({$redact: expression});
};

/**
 * Execute the aggregation with explain
 *
 * ####Example:
 *
 *     Model.aggregate(..).explain(callback)
 *
 * @param {Function} callback
 * @return {Promise}
 */

Aggregate.prototype.explain = function(callback) {
  const model = this._model;

  return utils.promiseOrCallback(callback, cb => {
    if (!this._pipeline.length) {
      const err = new Error('Aggregate has empty pipeline');
      return cb(err);
    }

    prepareDiscriminatorPipeline(this);

    model.hooks.execPre('aggregate', this, error => {
      if (error) {
        const _opts = { error: error };
        return model.hooks.execPost('aggregate', this, [null], _opts, error => {
          cb(error);
        });
      }

      this.options.explain = true;

      model.collection.
        aggregate(this._pipeline, this.options || {}).
        explain((error, result) => {
          const _opts = { error: error };
          return model.hooks.execPost('aggregate', this, [result], _opts, error => {
            if (error) {
              return cb(error);
            }
            return cb(null, result);
          });
        });
    });
  }, model.events);
};

/**
 * Sets the allowDiskUse option for the aggregation query (ignored for < 2.6.0)
 *
 * ####Example:
 *
 *     await Model.aggregate([{ $match: { foo: 'bar' } }]).allowDiskUse(true);
 *
 * @param {Boolean} value Should tell server it can use hard drive to store data during aggregation.
 * @param {Array} [tags] optional tags for this query
 * @see mongodb http://docs.mongodb.org/manual/reference/command/aggregate/
 */

Aggregate.prototype.allowDiskUse = function(value) {
  this.options.allowDiskUse = value;
  return this;
};

/**
 * Sets the hint option for the aggregation query (ignored for < 3.6.0)
 *
 * ####Example:
 *
 *     Model.aggregate(..).hint({ qty: 1, category: 1 }).exec(callback)
 *
 * @param {Object|String} value a hint object or the index name
 * @see mongodb http://docs.mongodb.org/manual/reference/command/aggregate/
 */

Aggregate.prototype.hint = function(value) {
  this.options.hint = value;
  return this;
};

/**
 * Sets the session for this aggregation. Useful for [transactions](/docs/transactions.html).
 *
 * ####Example:
 *
 *     const session = await Model.startSession();
 *     await Model.aggregate(..).session(session);
 *
 * @param {ClientSession} session
 * @see mongodb http://docs.mongodb.org/manual/reference/command/aggregate/
 */

Aggregate.prototype.session = function(session) {
  if (session == null) {
    delete this.options.session;
  } else {
    this.options.session = session;
  }
  return this;
};

/**
 * Lets you set arbitrary options, for middleware or plugins.
 *
 * ####Example:
 *
 *     var agg = Model.aggregate(..).option({ allowDiskUse: true }); // Set the `allowDiskUse` option
 *     agg.options; // `{ allowDiskUse: true }`
 *
 * @param {Object} options keys to merge into current options
 * @param [options.maxTimeMS] number limits the time this aggregation will run, see [MongoDB docs on `maxTimeMS`](https://docs.mongodb.com/manual/reference/operator/meta/maxTimeMS/)
 * @param [options.allowDiskUse] boolean if true, the MongoDB server will use the hard drive to store data during this aggregation
 * @param [options.collation] object see [`Aggregate.prototype.collation()`](./docs/api.html#aggregate_Aggregate-collation)
 * @param [options.session] ClientSession see [`Aggregate.prototype.session()`](./docs/api.html#aggregate_Aggregate-session)
 * @see mongodb http://docs.mongodb.org/manual/reference/command/aggregate/
 * @return {Aggregate} this
 * @api public
 */

Aggregate.prototype.option = function(value) {
  for (const key in value) {
    this.options[key] = value[key];
  }
  return this;
};

/**
 * Sets the cursor option option for the aggregation query (ignored for < 2.6.0).
 * Note the different syntax below: .exec() returns a cursor object, and no callback
 * is necessary.
 *
 * ####Example:
 *
 *     var cursor = Model.aggregate(..).cursor({ batchSize: 1000 }).exec();
 *     cursor.eachAsync(function(error, doc) {
 *       // use doc
 *     });
 *
 * @param {Object} options
 * @param {Number} options.batchSize set the cursor batch size
 * @param {Boolean} [options.useMongooseAggCursor] use experimental mongoose-specific aggregation cursor (for `eachAsync()` and other query cursor semantics)
 * @return {Aggregate} this
 * @api public
 * @see mongodb http://mongodb.github.io/node-mongodb-native/2.0/api/AggregationCursor.html
 */

Aggregate.prototype.cursor = function(options) {
  if (!this.options) {
    this.options = {};
  }
  this.options.cursor = options || {};
  return this;
};

/**
 * Sets an option on this aggregation. This function will be deprecated in a
 * future release. Use the [`cursor()`](./api.html#aggregate_Aggregate-cursor),
 * [`collation()`](./api.html#aggregate_Aggregate-collation), etc. helpers to
 * set individual options, or access `agg.options` directly.
 *
 * Note that MongoDB aggregations [do **not** support the `noCursorTimeout` flag](https://jira.mongodb.org/browse/SERVER-6036),
 * if you try setting that flag with this function you will get a "unrecognized field 'noCursorTimeout'" error.
 *
 * @param {String} flag
 * @param {Boolean} value
 * @return {Aggregate} this
 * @api public
 * @deprecated Use [`.option()`](api.html#aggregate_Aggregate-option) instead. Note that MongoDB aggregations do **not** support a `noCursorTimeout` option.
 */

Aggregate.prototype.addCursorFlag = util.deprecate(function(flag, value) {
  if (!this.options) {
    this.options = {};
  }
  this.options[flag] = value;
  return this;
}, 'Mongoose: `Aggregate#addCursorFlag()` is deprecated, use `option()` instead');

/**
 * Adds a collation
 *
 * ####Example:
 *
 *     Model.aggregate(..).collation({ locale: 'en_US', strength: 1 }).exec();
 *
 * @param {Object} collation options
 * @return {Aggregate} this
 * @api public
 * @see mongodb http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#aggregate
 */

Aggregate.prototype.collation = function(collation) {
  if (!this.options) {
    this.options = {};
  }
  this.options.collation = collation;
  return this;
};

/**
 * Combines multiple aggregation pipelines.
 *
 * ####Example:
 *
 *     Model.aggregate(...)
 *      .facet({
 *        books: [{ groupBy: '$author' }],
 *        price: [{ $bucketAuto: { groupBy: '$price', buckets: 2 } }]
 *      })
 *      .exec();
 *
 *     // Output: { books: [...], price: [{...}, {...}] }
 *
 * @param {Object} facet options
 * @return {Aggregate} this
 * @see $facet https://docs.mongodb.com/v3.4/reference/operator/aggregation/facet/
 * @api public
 */

Aggregate.prototype.facet = function(options) {
  return this.append({$facet: options});
};

/**
 * Returns the current pipeline
 *
 * ####Example:
 *
 *     MyModel.aggregate().match({ test: 1 }).pipeline(); // [{ $match: { test: 1 } }]
 *
 * @return {Array}
 * @api public
 */


Aggregate.prototype.pipeline = function() {
  return this._pipeline;
};

/**
 * Executes the aggregate pipeline on the currently bound Model.
 *
 * ####Example:
 *
 *     aggregate.exec(callback);
 *
 *     // Because a promise is returned, the `callback` is optional.
 *     var promise = aggregate.exec();
 *     promise.then(..);
 *
 * @see Promise #promise_Promise
 * @param {Function} [callback]
 * @return {Promise}
 * @api public
 */

Aggregate.prototype.exec = function(callback) {
  if (!this._model) {
    throw new Error('Aggregate not bound to any Model');
  }
  const model = this._model;
  const collection = this._model.collection;

  applyGlobalMaxTimeMS(this.options, model);

  if (this.options && this.options.cursor) {
    return new AggregationCursor(this);
  }

  return utils.promiseOrCallback(callback, cb => {

    prepareDiscriminatorPipeline(this);

    model.hooks.execPre('aggregate', this, error => {
      if (error) {
        const _opts = { error: error };
        return model.hooks.execPost('aggregate', this, [null], _opts, error => {
          cb(error);
        });
      }
      if (!this._pipeline.length) {
        return cb(new Error('Aggregate has empty pipeline'));
      }

      const options = utils.clone(this.options || {});
      collection.aggregate(this._pipeline, options, (error, cursor) => {
        if (error) {
          const _opts = { error: error };
          return model.hooks.execPost('aggregate', this, [null], _opts, error => {
            if (error) {
              return cb(error);
            }
            return cb(null);
          });
        }
        cursor.toArray((error, result) => {
          const _opts = { error: error };
          model.hooks.execPost('aggregate', this, [result], _opts, (error, result) => {
            if (error) {
              return cb(error);
            }

            cb(null, result);
          });
        });
      });
    });
  }, model.events);
};

/**
 * Provides promise for aggregate.
 *
 * ####Example:
 *
 *     Model.aggregate(..).then(successCallback, errorCallback);
 *
 * @see Promise #promise_Promise
 * @param {Function} [resolve] successCallback
 * @param {Function} [reject]  errorCallback
 * @return {Promise}
 */
Aggregate.prototype.then = function(resolve, reject) {
  return this.exec().then(resolve, reject);
};

/**
 * Executes the query returning a `Promise` which will be
 * resolved with either the doc(s) or rejected with the error.
 * Like [`.then()`](#query_Query-then), but only takes a rejection handler.
 *
 * @param {Function} [reject]
 * @return {Promise}
 * @api public
 */

Aggregate.prototype.catch = function(reject) {
  return this.exec().then(null, reject);
};

/**
 * Returns an asyncIterator for use with [`for/await/of` loops](http://bit.ly/async-iterators)
 * You do not need to call this function explicitly, the JavaScript runtime
 * will call it for you.
 *
 * ####Example
 *
 *     const agg = Model.aggregate([{ $match: { age: { $gte: 25 } } }]);
 *     for await (const doc of agg) {
 *       console.log(doc.name);
 *     }
 *
 * Node.js 10.x supports async iterators natively without any flags. You can
 * enable async iterators in Node.js 8.x using the [`--harmony_async_iteration` flag](https://github.com/tc39/proposal-async-iteration/issues/117#issuecomment-346695187).
 *
 * **Note:** This function is not set if `Symbol.asyncIterator` is undefined. If
 * `Symbol.asyncIterator` is undefined, that means your Node.js version does not
 * support async iterators.
 *
 * @method Symbol.asyncIterator
 * @memberOf Aggregate
 * @instance
 * @api public
 */

if (Symbol.asyncIterator != null) {
  Aggregate.prototype[Symbol.asyncIterator] = function() {
    return this.cursor({ useMongooseAggCursor: true }).
      exec().
      transformNull().
      map(doc => {
        return doc == null ? { done: true } : { value: doc, done: false };
      });
  };
}

/*!
 * Helpers
 */

/**
 * Checks whether an object is likely a pipeline operator
 *
 * @param {Object} obj object to check
 * @return {Boolean}
 * @api private
 */

function isOperator(obj) {
  if (typeof obj !== 'object') {
    return false;
  }

  const k = Object.keys(obj);

  return k.length === 1 && k.some(key => { return key[0] === '$'; });
}

/*!
 * Adds the appropriate `$match` pipeline step to the top of an aggregate's
 * pipeline, should it's model is a non-root discriminator type. This is
 * analogous to the `prepareDiscriminatorCriteria` function in `lib/query.js`.
 *
 * @param {Aggregate} aggregate Aggregate to prepare
 */

Aggregate._prepareDiscriminatorPipeline = prepareDiscriminatorPipeline;

function prepareDiscriminatorPipeline(aggregate) {
  const schema = aggregate._model.schema;
  const discriminatorMapping = schema && schema.discriminatorMapping;

  if (discriminatorMapping && !discriminatorMapping.isRoot) {
    const originalPipeline = aggregate._pipeline;
    const discriminatorKey = discriminatorMapping.key;
    const discriminatorValue = discriminatorMapping.value;

    // If the first pipeline stage is a match and it doesn't specify a `__t`
    // key, add the discriminator key to it. This allows for potential
    // aggregation query optimizations not to be disturbed by this feature.
    if (originalPipeline[0] && originalPipeline[0].$match && !originalPipeline[0].$match[discriminatorKey]) {
      originalPipeline[0].$match[discriminatorKey] = discriminatorValue;
      // `originalPipeline` is a ref, so there's no need for
      // aggregate._pipeline = originalPipeline
    } else if (originalPipeline[0] && originalPipeline[0].$geoNear) {
      originalPipeline[0].$geoNear.query =
          originalPipeline[0].$geoNear.query || {};
      originalPipeline[0].$geoNear.query[discriminatorKey] = discriminatorValue;
    } else {
      const match = {};
      match[discriminatorKey] = discriminatorValue;
      aggregate._pipeline.unshift({ $match: match });
    }
  }
}

/*!
 * Exports
 */

module.exports = Aggregate;
