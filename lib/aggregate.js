/*!
 * Module dependencies
 */

var Promise = require('./promise')
  , util = require('util');
  

/**
 * Aggregate constructor used for building aggregation pipelines
 *
 * ####Note:
 * - At this time, arguments are not cast to the schema because $project operators allow redefining the "shape" of the documents at any stage of the pipeline.
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
 * @param {Object} arg $project operator contents
 * @return {Aggregate}
 * @api public
 */
Aggregate.prototype.project = function (arg) {
  return this.append({ $project: arg });
};


/**
 * Appends a new custom $group operator to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.group({ _id: "$department" });
 *
 * @param {Object} arg $group operator contents
 * @return {Aggregate}
 * @api public
 */
Aggregate.prototype.group = function (arg) {
  return this.append({ $group: arg });
};


/**
 * Appends a new $skip operator to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.skip(10);
 *
 * @param {Number} count number of records to skip before next stage
 * @return {Aggregate}
 * @api public
 */
Aggregate.prototype.skip = function (count) {
  return this.append({ $skip: count });
};


/**
 * Appends a new $limit operator to this aggregate pipeline.
 *
 * ####Examples:
 *
 *     aggregate.limit(10);
 *
 * @param {Number} count maximum number of records to pass to the next stage
 * @return {Aggregate}
 * @api public
 */
Aggregate.prototype.limit = function (count) {
  return this.append({ $limit: count });
};


/**
 * Executes the aggregate pipeline on the currently bound Model, if any
 *
 * ####Examples:
 *
 *     aggregate.exec(callback);
 
 * ####NOTE:
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
