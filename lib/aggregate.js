/*jshint node:true, laxcomma: true */
"use strict";

/*!
 * Module dependencies
 */

var Promise = require('./promise')
  , util = require('util');
  

/**
 * Aggregate constructor used for building aggregation pipelines
 *
 * ####Note:
 * - The documents returned are plain javascript objects, not mongoose documents cast to this models schema definition (since any shape of document can be returned).
 * - Requires MongoDB >= 2.1
 *
 * @see aggregation http://docs.mongodb.org/manual/applications/aggregation/
 * @see driver http://mongodb.github.com/node-mongodb-native/api-generated/collection.html#aggregate
 * @api public
 */
function Aggregate () {
  this._pipeline = [];
  this._model = undefined;
}


/**
 * Binds this aggregate to a model.
 *
 * @param {Model} model the model to which the aggregate is to be bound
 * @return {Aggregate}
 * @api public
 */
Aggregate.prototype.bind = function (model) {
  this._model = model;
  return this;
};


/**
 * Appends new operators to this aggregate pipeline
 *
 * ####Examples
 *
 *     aggregate.append({ $project: { field: 1 } }, { $limit: 2 });
 *
 * @param {Object} [...] operators to append
 * @return {Aggregate}
 * @api public
 */
Aggregate.prototype.append = function () {
  var args = [].slice.call(arguments)
    , arg;

  if (!args.every(function (arg) { return 'object' === typeof arg && !util.isArray(arg); })) {
    throw new Error("Arguments must be aggregate pipeline operators");
  }

  this._pipeline = this._pipeline.concat(args);

  return this;
};


/**
 * Appends a new $project operator to this aggregate pipeline, specifying which
 * document fields to include or exclude.
 *
 * ####Examples:
 *
 *     // include a, include b, exclude c
 *     aggregate.select("a b -c");
 *
 *     // or you may use object notation, useful when
 *     // you have keys already prefixed with a "-"
 *     query.select({a: 1, b: 1, c: 0});
 *
 * ####Note:
 *
 *     Use aggregate.project for more complex uses.
 *
 * @param {Object|String} arg field specification
 * @return {Aggregate}
 * @api public
 */
Aggregate.prototype.select = function (arg) {
  var fields = {};

  if ('object' === typeof arg && !util.isArray(arg)) {
    Object.keys(arg).forEach(function (field) {
      fields[field] = arg[field];
    });
  } else if (1 === arguments.length && 'string' === typeof arg) {
    arg.split(/\s+/).forEach(function (field) {
      if (!field) return;
      var include = '-' == field[0] ? 0 : 1;
      if (include === 0) field = field.substring(1);
      fields[field] = include;
    });
  } else {
    throw new Error("Invalid select() argument. Must be string or object");
  }

  return this.project(fields);
};


/**
 * Appends a new custom $project operator to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.project({ salary_k: { $divide: [ "$salary", 1000 ] } });
 *
 * @see $project http://docs.mongodb.org/manual/reference/aggregation/project/
 * @method project
 * @memberOf Aggregate
 * @param {Object} arg $project operator contents
 * @return {Aggregate}
 * @api public
 */

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
 *     aggregate.match({ department: { $in: [ "sales", "r&d" } } });
 *
 * ####Note:
 *
 *     For now query-like syntax is not supported (eg .where("department").in(["sales", "r&d"]))
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
 * @param {Number} arg number of records to skip before next stage
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
 * @param {Number} arg maximum number of records to pass to the next stage
 * @return {Aggregate}
 * @api public
 */

'project group match skip limit'.split(' ').forEach(function ($operator) {
  Aggregate.prototype[$operator] = function(arg) {
    var op = {};

    op['$' + $operator] = arg;
    return this.append(op);
  };
});


/**
 * Appends new custom $unwind operator(s) to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.unwind("tags");
 *     aggregate.unwind("a", "b", "c");
 *
 * @see $unwind http://docs.mongodb.org/manual/reference/aggregation/unwind/
 * @param {String} [...] fields to unwind
 * @return {Aggregate}
 * @api public
 */
Aggregate.prototype.unwind = function () {
  var args = [].slice.call(arguments);

  return this.append.apply(this, args.map(function (arg) {
    return { $unwind: '$' + arg };
  }));
};

/**
 * Appends a new $sort operator to this aggregate pipeline.
 *
 * If an object is passed, values allowed are 'asc', 'desc', 'ascending', 'descending', 1, and -1.
 *
 * If a string is passed, it must be a space delimited list of path names. The sort order of each path is ascending unless the path name is prefixed with `-` which will be treated as descending.
 *
 * ####Example
 *
 *     // these are equivalent
 *     aggregate.sort({ field: 'asc', test: -1 });
 *     aggregate.sort('field -test');
 *
 * @see $sort http://docs.mongodb.org/manual/reference/aggregation/sort/
 * @param {Object|String} arg
 * @return {Query} this
 * @api public
 */
Aggregate.prototype.sort = function(arg) {
  var sort = {};
  
  if ('Object' === arg.constructor.name) {
    var desc = ['desc', 'descending', -1];
    Object.keys(arg).forEach(function (field) {
      sort[field] = desc.indexOf(arg[field]) === -1 ? 1 : -1;
    });
  } else if (1 === arguments.length && 'string' == typeof arg) {
    arg.split(/\s+/).forEach(function (field) {
      if (!field) return;
      var ascend = '-' == field[0] ? -1 : 1;
      if (ascend === -1) field = field.substring(1);
      sort[field] = ascend;
    });
  } else {
    throw new TypeError('Invalid sort() argument. Must be a string or object.');
  }
  
  return this.append({ $sort: sort });
};

 
/**
 * Executes the aggregate pipeline on the currently bound Model, if any
 *
 * ####Examples:
 *
 *     aggregate.exec(callback);
 *
 * @param {Function} [callback]
 * @return {Promise}
 * @api public
 */
Aggregate.prototype.exec = function (callback) {
  var promise = new Promise();

  if (callback) {
     promise.addBack(callback);
  }

  if (!this._pipeline.length) {
    // Should we add a { $skip: 0 } instead ?
    promise.error(new Error("Aggregate has empty pipeline"));
    return this;
  }

  if (!this._model) {
    promise.error(new Error("Aggregate not bound to any Model"));
    return this;
  }

  this._model.collection.aggregate(this._pipeline, function (err, docs) {
    if (err) {
      return promise.error(err);
    }

    promise.complete(docs);
  });

  return promise;
};


/*!
 * Exports
 */

module.exports = Aggregate;
