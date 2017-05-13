/*!
 * Module dependencies
 */

var util = require('util');
var utils = require('./utils');
var PromiseProvider = require('./promise_provider');
var Query = require('./query');
var read = Query.prototype.read;

/**
 * Aggregate constructor used for building aggregation pipelines.
 *
 * ####Example:
 *
 *     new Aggregate();
 *     new Aggregate({ $project: { a: 1, b: 1 } });
 *     new Aggregate({ $project: { a: 1, b: 1 } }, { $skip: 5 });
 *     new Aggregate([{ $project: { a: 1, b: 1 } }, { $skip: 5 }]);
 *
 * Returned when calling Model.aggregate().
 *
 * ####Example:
 *
 *     Model
 *     .aggregate({ $match: { age: { $gte: 21 }}})
 *     .unwind('tags')
 *     .exec(callback)
 *
 * ####Note:
 *
 * - The documents returned are plain javascript objects, not mongoose documents (since any shape of document can be returned).
 * - Requires MongoDB >= 2.1
 * - Mongoose does **not** cast pipeline stages. `new Aggregate({ $match: { _id: '00000000000000000000000a' } });` will not work unless `_id` is a string in the database. Use `new Aggregate({ $match: { _id: mongoose.Types.ObjectId('00000000000000000000000a') } });` instead.
 *
 * @see MongoDB http://docs.mongodb.org/manual/applications/aggregation/
 * @see driver http://mongodb.github.com/node-mongodb-native/api-generated/collection.html#aggregate
 * @param {Object|Array} [ops] aggregation operator(s) or operator array
 * @api public
 */

function Aggregate() {
  this._pipeline = [];
  this._model = undefined;
  this.options = undefined;

  if (arguments.length === 1 && util.isArray(arguments[0])) {
    this.append.apply(this, arguments[0]);
  } else {
    this.append.apply(this, arguments);
  }
}

/**
 * Binds this aggregate to a model.
 *
 * @param {Model} model the model to which the aggregate is to be bound
 * @return {Aggregate}
 * @api public
 */

Aggregate.prototype.model = function(model) {
  this._model = model;
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
  var args = (arguments.length === 1 && util.isArray(arguments[0]))
      ? arguments[0]
      : utils.args(arguments);

  if (!args.every(isOperator)) {
    throw new Error('Arguments must be aggregate pipeline operators');
  }

  this._pipeline = this._pipeline.concat(args);

  return this;
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
  var fields = {};

  if (typeof arg === 'object' && !util.isArray(arg)) {
    Object.keys(arg).forEach(function(field) {
      fields[field] = arg[field];
    });
  } else if (arguments.length === 1 && typeof arg === 'string') {
    arg.split(/\s+/).forEach(function(field) {
      if (!field) {
        return;
      }
      var include = field[0] === '-' ? 0 : 1;
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
 * @param {Object} parameters
 * @return {Aggregate}
 * @api public
 */

Aggregate.prototype.near = function(arg) {
  var op = {};
  op.$geoNear = arg;
  return this.append(op);
};

/*!
 * define methods
 */

'group match skip limit out'.split(' ').forEach(function($operator) {
  Aggregate.prototype[$operator] = function(arg) {
    var op = {};
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
  var args = utils.args(arguments);

  var res = [];
  for (var i = 0; i < args.length; ++i) {
    var arg = args[i];
    if (arg && typeof arg === 'object') {
      res.push({ $unwind: arg });
    } else if (typeof arg === 'string') {
      res.push({
        $unwind: (arg && arg.charAt(0) === '$') ? arg : '$' + arg
      });
    } else {
      throw new Error('Invalid arg "' + arg + '" to unwind(), ' +
        'must be string or object');
    }
  }

  return this.append.apply(this, res);
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
  var cloneOptions = {};
  if (options) {
    if (!utils.isObject(options)) {
      throw new TypeError('Invalid graphLookup() argument. Must be an object.');
    }

    utils.mergeClone(cloneOptions, options);
    var startWith = cloneOptions.startWith;

    if (startWith && typeof startWith === 'string') {
      cloneOptions.startWith = cloneOptions.startWith.charAt(0) === '$' ?
        cloneOptions.startWith :
        '$' + cloneOptions.startWith;
    }

  }
  return this.append({ $graphLookup: cloneOptions });
};

/**
 * Appepnds new custom $sample operator(s) to this aggregate pipeline.
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

  var sort = {};

  if (arg.constructor.name === 'Object') {
    var desc = ['desc', 'descending', -1];
    Object.keys(arg).forEach(function(field) {
      sort[field] = desc.indexOf(arg[field]) === -1 ? 1 : -1;
    });
  } else if (arguments.length === 1 && typeof arg === 'string') {
    arg.split(/\s+/).forEach(function(field) {
      if (!field) {
        return;
      }
      var ascend = field[0] === '-' ? -1 : 1;
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
  var _this = this;
  var Promise = PromiseProvider.get();
  return new Promise.ES6(function(resolve, reject) {
    if (!_this._pipeline.length) {
      var err = new Error('Aggregate has empty pipeline');
      if (callback) {
        callback(err);
      }
      reject(err);
      return;
    }

    prepareDiscriminatorPipeline(_this);

    _this._model
        .collection
        .aggregate(_this._pipeline, _this.options || {})
        .explain(function(error, result) {
          if (error) {
            if (callback) {
              callback(error);
            }
            reject(error);
            return;
          }

          if (callback) {
            callback(null, result);
          }
          resolve(result);
        });
  });
};

/**
 * Sets the allowDiskUse option for the aggregation query (ignored for < 2.6.0)
 *
 * ####Example:
 *
 *     Model.aggregate(..).allowDiskUse(true).exec(callback)
 *
 * @param {Boolean} value Should tell server it can use hard drive to store data during aggregation.
 * @param {Array} [tags] optional tags for this query
 * @see mongodb http://docs.mongodb.org/manual/reference/command/aggregate/
 */

Aggregate.prototype.allowDiskUse = function(value) {
  if (!this.options) {
    this.options = {};
  }
  this.options.allowDiskUse = value;
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
 *     cursor.each(function(error, doc) {
 *       // use doc
 *     });
 *
 * @param {Object} options set the cursor batch size
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
 * Adds a [cursor flag](http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#addCursorFlag)
 *
 * ####Example:
 *
 *     Model.aggregate(..).addCursorFlag('noCursorTimeout', true).exec();
 *
 * @param {String} flag
 * @param {Boolean} value
 * @see mongodb http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#addCursorFlag
 */

Aggregate.prototype.addCursorFlag = function(flag, value) {
  if (!this.options) {
    this.options = {};
  }
  this.options[flag] = value;
  return this;
};

/**
 * Adds a collation
 *
 * ####Example:
 *
 *     Model.aggregate(..).collation({ locale: 'en_US', strength: 1 }).exec();
 *
 * @param {Object} collation options
 * @param {Boolean} value
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
  var _this = this;
  var Promise = PromiseProvider.get();
  var options = utils.clone(this.options);

  if (options && options.cursor) {
    if (options.cursor.async) {
      delete options.cursor.async;
      return new Promise.ES6(function(resolve) {
        if (!_this._model.collection.buffer) {
          process.nextTick(function() {
            var cursor = _this._model.collection.
              aggregate(_this._pipeline, options || {});
            decorateCursor(cursor);
            resolve(cursor);
            callback && callback(null, cursor);
          });
          return;
        }
        _this._model.collection.emitter.once('queue', function() {
          var cursor = _this._model.collection.
            aggregate(_this._pipeline, options || {});
          decorateCursor(cursor);
          resolve(cursor);
          callback && callback(null, cursor);
        });
      });
    }
    var cursor = this._model.collection.
      aggregate(this._pipeline, this.options || {});
    decorateCursor(cursor);
    return cursor;
  }

  return new Promise.ES6(function(resolve, reject) {
    if (!_this._pipeline.length) {
      var err = new Error('Aggregate has empty pipeline');
      if (callback) {
        callback(err);
      }
      reject(err);
      return;
    }

    prepareDiscriminatorPipeline(_this);

    _this._model
        .collection
        .aggregate(_this._pipeline, _this.options || {}, function(error, result) {
          if (error) {
            if (callback) {
              callback(error);
            }
            reject(error);
            return;
          }

          if (callback) {
            callback(null, result);
          }
          resolve(result);
        });
  });
};

/*!
 * Add `eachAsync()` to aggregation cursors
 */

function decorateCursor(cursor) {
  cursor.eachAsync = function(fn, callback) {
    var Promise = PromiseProvider.get();

    var handleNextResult = function(doc, callback) {
      var promise = fn(doc);
      if (promise && typeof promise.then === 'function') {
        promise.then(
          function() { callback(null); },
          function(error) { callback(error); });
      } else {
        callback(null);
      }
    };

    var iterate = function(callback) {
      return cursor.next(function(error, doc) {
        if (error) {
          return callback(error);
        }
        if (!doc) {
          return callback(null);
        }
        handleNextResult(doc, function(error) {
          if (error) {
            return callback(error);
          }
          setTimeout(function() {
            iterate(callback);
          }, 0);
        });
      });
    };

    return new Promise.ES6(function(resolve, reject) {
      iterate(function(error) {
        if (error) {
          callback && callback(error);
          return reject(error);
        }
        callback && callback(null);
        return resolve();
      });
    });
  };
}

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
  var k;

  if (typeof obj !== 'object') {
    return false;
  }

  k = Object.keys(obj);

  return k.length === 1 && k
          .some(function(key) {
            return key[0] === '$';
          });
}

/*!
 * Adds the appropriate `$match` pipeline step to the top of an aggregate's
 * pipeline, should it's model is a non-root discriminator type. This is
 * analogous to the `prepareDiscriminatorCriteria` function in `lib/query.js`.
 *
 * @param {Aggregate} aggregate Aggregate to prepare
 */

function prepareDiscriminatorPipeline(aggregate) {
  var schema = aggregate._model.schema,
      discriminatorMapping = schema && schema.discriminatorMapping;

  if (discriminatorMapping && !discriminatorMapping.isRoot) {
    var originalPipeline = aggregate._pipeline,
        discriminatorKey = discriminatorMapping.key,
        discriminatorValue = discriminatorMapping.value;

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
      var match = {};
      match[discriminatorKey] = discriminatorValue;
      aggregate._pipeline = [{$match: match}].concat(originalPipeline);
    }
  }
}


/*!
 * Exports
 */

module.exports = Aggregate;
