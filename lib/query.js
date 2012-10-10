/*!
 * Module dependencies.
 */

var utils = require('./utils')
  , merge = utils.merge
  , Promise = require('./promise')
  , Document = require('./document')
  , Types = require('./schema/index')
  , inGroupsOf = utils.inGroupsOf
  , tick = utils.tick
  , QueryStream = require('./querystream')
  , ReadPref = require('mongodb').ReadPreference

/**
 * Query constructor used for building queries.
 *
 * ####Example:
 *
 *     var query = Model.find();
 *     query.where('age').gte(21).exec(callback);
 *
 * @param {Object} criteria
 * @param {Object} options
 * @api public
 */

function Query (criteria, options) {
  this.setOptions(options, true);
  this._conditions = {};
  this._updateArg = {};
  this._fields = undefined;
  if (criteria) this.find(criteria);
}

/**
 * Sets query options.
 *
 * ####Options:
 *
 * - [tailable](http://www.mongodb.org/display/DOCS/Tailable+Cursors) *
 * - [sort](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsort(\)%7D%7D) *
 * - [limit](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Blimit%28%29%7D%7D) *
 * - [skip](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bskip%28%29%7D%7D) *
 * - [maxscan](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24maxScan) *
 * - [batchSize](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7BbatchSize%28%29%7D%7D) *
 * - [comment](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24comment) *
 * - [snapshot](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsnapshot%28%29%7D%7D) *
 * - [hint](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24hint) *
 * - [slaveOk](http://docs.mongodb.org/manual/applications/replication/#read-preference) *
 * - [lean](./api.html#query_Query-lean) *
 * - [safe](http://www.mongodb.org/display/DOCS/getLastError+Command)
 *
 * _* denotes a query helper method is also available_
 *
 * @param {Object} options
 * @api public
 */

Query.prototype.setOptions = function (options, overwrite) {
  // overwrite is internal use only
  if (overwrite) {
    options = this.options = options || {};
    this.safe = options.safe

    // normalize population options
    var pop = this.options.populate;
    this.options.populate = {};

    if (pop && Array.isArray(pop)) {
      for (var i = 0, l = pop.length; i < l; i++) {
        this.options.populate[pop[i]] = {};
      }
    }

    return this;
  }

  if (!(options && 'Object' == options.constructor.name))
    return this;

  if ('safe' in options)
    this.safe = options.safe;

  // set arbitrary options
  var methods = Object.keys(options)
    , i = methods.length
    , method

  while (i--) {
    method = methods[i];

    // use methods if exist (safer option manipulation)
    if ('function' == typeof this[method]) {
      var args = Array.isArray(options[method])
        ? options[method]
        : [options[method]];
      this[method].apply(this, args)
    } else {
      this.options[method] = options[method];
    }
  }
  return this;
}

/**
 * Binds this query to a model.
 *
 * @param {Model} model the model to which the query is bound
 * @param {String} op the operation to execute
 * @param {Object} updateArg used in update methods
 * @return {Query}
 * @api private
 */

Query.prototype.bind = function bind (model, op, updateArg) {
  this.model = model;
  this.op = op;

  if (model._mapreduce) this.options.lean = true;

  if (op == 'update' || op == 'findOneAndUpdate') {
    merge(this._updateArg, updateArg || {});
  }

  return this;
};

/**
 * Executes the query
 *
 * ####Examples
 *
 *     query.exec();
 *     query.exec(callback);
 *     query.exec('update');
 *     query.exec('find', callback);
 *
 * @param {String|Function} [operation]
 * @param {Function} [callback]
 * @return {Promise}
 * @api public
 */

Query.prototype.exec = function exec (op, callback) {
  var promise = new Promise();

  switch (typeof op) {
    case 'function':
      callback = op;
      op = null;
      break;
    case 'string':
      this.op = op;
      break;
  }

  if (callback) promise.addBack(callback);

  if (!this.op) {
    promise.complete();
    return promise;
  }

  if ('update' == this.op) {
    this[this.op](this._updateArg, promise.resolve.bind(promise));
    return promise;
  }

  if ('distinct' == this.op) {
    this.distinct(this._distinctArg, promise.resolve.bind(promise));
    return promise;
  }

  this[this.op](promise.resolve.bind(promise));
  return promise;
};

/**
 * Finds documents.
 *
 * When no `callback` is passed, the query is not executed.
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

Query.prototype.find = function (criteria, callback) {
  this.op = 'find';
  if ('function' === typeof criteria) {
    callback = criteria;
    criteria = {};
  } else if (criteria instanceof Query) {
    // TODO Merge options, too
    merge(this._conditions, criteria._conditions);
  } else if (criteria instanceof Document) {
    merge(this._conditions, criteria.toObject());
  } else if (criteria && 'Object' === criteria.constructor.name) {
    merge(this._conditions, criteria);
  }
  if (!callback) return this;
  return this.execFind(callback);
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

Query.prototype.cast = function (model, obj) {
  obj || (obj= this._conditions);

  var schema = model.schema
    , paths = Object.keys(obj)
    , i = paths.length
    , any$conditionals
    , schematype
    , nested
    , path
    , type
    , val;

  while (i--) {
    path = paths[i];
    val = obj[path];

    if ('$or' === path || '$nor' === path) {
      var k = val.length
        , orComponentQuery;

      while (k--) {
        orComponentQuery = new Query(val[k]);
        orComponentQuery.cast(model);
        val[k] = orComponentQuery._conditions;
      }

    } else if (path === '$where') {
      type = typeof val;

      if ('string' !== type && 'function' !== type) {
        throw new Error("Must have a string or function for $where");
      }

      if ('function' === type) {
        obj[path] = val.toString();
      }

      continue;

    } else {

      if (!schema) {
        // no casting for Mixed types
        continue;
      }

      schematype = schema.path(path);

      if (!schematype) {
        // Handle potential embedded array queries
        var split = path.split('.')
          , j = split.length
          , pathFirstHalf
          , pathLastHalf
          , remainingConds
          , castingQuery;

        // Find the part of the var path that is a path of the Schema
        while (j--) {
          pathFirstHalf = split.slice(0, j).join('.');
          schematype = schema.path(pathFirstHalf);
          if (schematype) break;
        }

        // If a substring of the input path resolves to an actual real path...
        if (schematype) {
          // Apply the casting; similar code for $elemMatch in schema/array.js
          if (schematype.caster && schematype.caster.schema) {
            remainingConds = {};
            pathLastHalf = split.slice(j).join('.');
            remainingConds[pathLastHalf] = val;
            castingQuery = new Query(remainingConds);
            castingQuery.cast(schematype.caster);
            obj[path] = castingQuery._conditions[pathLastHalf];
          } else {
            obj[path] = val;
          }
        }

      } else if (val === null || val === undefined) {
        continue;
      } else if ('Object' === val.constructor.name) {

        any$conditionals = Object.keys(val).some(function (k) {
          return k.charAt(0) === '$' && k !== '$id' && k !== '$ref';
        });

        if (!any$conditionals) {
          obj[path] = schematype.castForQuery(val);
        } else {

          var ks = Object.keys(val)
            , k = ks.length
            , $cond;

          while (k--) {
            $cond = ks[k];
            nested = val[$cond];

            if ('$exists' === $cond) {
              if ('boolean' !== typeof nested) {
                throw new Error("$exists parameter must be Boolean");
              }
              continue;
            }

            if ('$type' === $cond) {
              if ('number' !== typeof nested) {
                throw new Error("$type parameter must be Number");
              }
              continue;
            }

            if ('$not' === $cond) {
              this.cast(model, nested);
            } else {
              val[$cond] = schematype.castForQuery($cond, nested);
            }
          }
        }
      } else {
        obj[path] = schematype.castForQuery(val);
      }
    }
  }

  return obj;
};

/**
 * Returns default options.
 * @param {Model} model
 * @api private
 */

Query.prototype._optionsForExec = function (model) {
  var options = utils.clone(this.options, { retainKeyOrder: true });
  delete options.populate;

  if (!('safe' in options))
    options.safe = model.schema.options.safe;

  if (!('readPreference' in options) && model.schema.options.read)
    options.readPreference = model.schema.options.read;

  return options;
};

/**
 * Applies schematype selected options to this query.
 * @api private
 */

Query.prototype._applyPaths = function applyPaths () {
  // determine if query is selecting or excluding fields

  var fields = this._fields
    , exclude
    , keys
    , ki

  if (fields) {
    keys = Object.keys(fields);
    ki = keys.length;

    while (ki--) {
      if ('+' == keys[ki][0]) continue;
      exclude = 0 === fields[keys[ki]];
      break;
    }
  }

  // if selecting, apply default schematype select:true fields
  // if excluding, apply schematype select:false fields

  var selected = []
    , excluded = []
    , seen = [];

  analyzeSchema(this.model.schema);

  switch (exclude) {
    case true:
      excluded.length && this.select('-' + excluded.join(' -'));
      break;
    case false:
      selected.length && this.select(selected.join(' '));
      break;
    case undefined:
      // user didn't specify fields, implies returning all fields.
      // only need to apply excluded fields
      excluded.length && this.select('-' + excluded.join(' -'));
      break;
  }

  return seen = excluded = selected = keys = fields = null;

  function analyzeSchema (schema, prefix) {
    prefix || (prefix = '');

    // avoid recursion
    if (~seen.indexOf(schema)) return;
    seen.push(schema);

    schema.eachPath(function (path, type) {
      if (prefix) path = prefix + '.' + path;

      // array of subdocs?
      if (type.schema) {
        analyzeSchema(type.schema, path);
      }

      analyzePath(path, type);
    });
  }

  function analyzePath (path, type) {
    if ('boolean' != typeof type.selected) return;

    if (fields && ('+' + path) in fields) {
      // forced inclusion
      delete fields['+' + path];

      // if there are other fields being included, add this one
      // if no other included fields, leave this out (implied inclusion)
      if (false === exclude && keys.length > 1) {
        fields[path] = 1;
      }

      return
    };

    ;(type.selected ? selected : excluded).push(path);
  }
}

/**
 * Specifies a `$where` condition
 *
 * Use `$where` when you need to select documents using a JavaScript expression.
 *
 * ####Example
 *
 *     query.$where('this.comments.length > 10 || this.name.length > 5')
 *
 *     query.$where(function () {
 *       return this.comments.length > 10 || this.name.length > 5;
 *     })
 *
 * @param {String|Function} js javascript string or function
 * @return {Query} this
 * @memberOf Query
 * @method $where
 * @api public
 */

Query.prototype.$where = function (js) {
  this._conditions['$where'] = js;
  return this;
};

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
 *     // Moreover, you can also chain a bunch of these together:
 *
 *     User
 *     .where('age').gte(21).lte(65)
 *     .where('name', /^b/i)
 *     .where('friends').slice(10)
 *     .exec(callback)
 *
 * @param {String} [path]
 * @param {Object} [val]
 * @return {Query} this
 * @api public
 */

Query.prototype.where = function (path, val) {
  if (!arguments.length) return this;

  if ('string' != typeof path) {
    throw new TypeError('path must be a string');
  }

  this._currPath = path;

  if (2 === arguments.length) {
    this._conditions[path] = val;
  }

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
 * @param {Object} val
 * @return {Query} this
 * @api public
 */

Query.prototype.equals = function equals (val) {
  var path = this._currPath;
  if (!path) throw new Error('equals() must be used after where()');
  this._conditions[path] = val;
  return this;
}

/**
 * Specifies arguments for an `$or` condition.
 *
 * ####Example
 *
 *     query.or([{ color: 'red' }, { status: 'emergency' }])
 *
 * @param {Array} array array of conditions
 * @return {Query} this
 * @api public
 */

Query.prototype.or = function or (array) {
  var or = this._conditions.$or || (this._conditions.$or = []);
  if (!Array.isArray(array)) array = [array];
  or.push.apply(or, array);
  return this;
}

/**
 * Specifies arguments for a `$nor` condition.
 *
 * ####Example
 *
 *     query.nor([{ color: 'green' }, { status: 'ok' }])
 *
 * @param {Array} array array of conditions
 * @return {Query} this
 * @api public
 */

Query.prototype.nor = function nor (array) {
  var nor = this._conditions.$nor || (this._conditions.$nor = []);
  if (!Array.isArray(array)) array = [array];
  nor.push.apply(nor, array);
  return this;
}

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
 * @param {String} path
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $gte query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method gte
 * @memberOf Query
 * @param {String} path
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $lt query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method lt
 * @memberOf Query
 * @param {String} path
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $lte query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method lte
 * @memberOf Query
 * @param {String} path
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $ne query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method ne
 * @memberOf Query
 * @param {String} path
 * @param {Number} val
 * @api public
 */

/**
 * Specifies an $in query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method in
 * @memberOf Query
 * @param {String} path
 * @param {Number} val
 * @api public
 */

/**
 * Specifies an $nin query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method nin
 * @memberOf Query
 * @param {String} path
 * @param {Number} val
 * @api public
 */

/**
 * Specifies an $all query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method all
 * @memberOf Query
 * @param {String} path
 * @param {Number} val
 * @api public
 */

/**
 * Specifies an $size query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method size
 * @memberOf Query
 * @param {String} path
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $regex query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method regex
 * @memberOf Query
 * @param {String} path
 * @param {Number} val
 * @api public
 */

/**
 * Specifies a $maxDistance query condition.
 *
 * When called with one argument, the most recent path passed to `where()` is used.
 *
 * @method maxDistance
 * @memberOf Query
 * @param {String} path
 * @param {Number} val
 * @api public
 */

/*!
 * gt, gte, lt, lte, ne, in, nin, all, regex, size, maxDistance
 *
 *     Thing.where('type').nin(array)
 */

'gt gte lt lte ne in nin all regex size maxDistance'.split(' ').forEach(function ($conditional) {
  Query.prototype[$conditional] = function (path, val) {
    if (arguments.length === 1) {
      val = path;
      path = this._currPath
    }
    var conds = this._conditions[path] || (this._conditions[path] = {});
    conds['$' + $conditional] = val;
    return this;
  };
});

/**
 * Specifies a `$near` condition
 *
 * @param {String} path
 * @param {Number} val
 * @return {Query} this
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

Query.prototype.near = function (path, val) {
  if (arguments.length === 1) {
    val = path;
    path = this._currPath
  } else if (arguments.length === 2 && !Array.isArray(val)) {
    val = utils.args(arguments);
    path = this._currPath;
  } else if (arguments.length === 3) {
    val = utils.args(arguments, 1);
  }
  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds.$near = val;
  return this;
}

/**
 * Specifies a `$nearSphere` condition.
 *
 * @param {String} path
 * @param {Object} val
 * @return {Query} this
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

Query.prototype.nearSphere = function (path, val) {
  if (arguments.length === 1) {
    val = path;
    path = this._currPath
  } else if (arguments.length === 2 && !Array.isArray(val)) {
    val = utils.args(arguments);
    path = this._currPath;
  } else if (arguments.length === 3) {
    val = utils.args(arguments, 1);
  }
  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds.$nearSphere = val;
  return this;
}

/**
 * Specifies a `$mod` condition
 *
 * @param {String} path
 * @param {Number} val
 * @return {Query} this
 * @api public
 */

Query.prototype.mod = function (path, val) {
  if (arguments.length === 1) {
    val = path;
    path = this._currPath
  } else if (arguments.length === 2 && !Array.isArray(val)) {
    val = utils.args(arguments);
    path = this._currPath;
  } else if (arguments.length === 3) {
    val = utils.args(arguments, 1);
  }
  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds.$mod = val;
  return this;
}

/**
 * Specifies an `$exists` condition
 *
 * @param {String} path
 * @param {Number} val
 * @return {Query} this
 * @api public
 */

Query.prototype.exists = function (path, val) {
  if (arguments.length === 0) {
    path = this._currPath
    val = true;
  } else if (arguments.length === 1) {
    if ('boolean' === typeof path) {
      val = path;
      path = this._currPath;
    } else {
      val = true;
    }
  }
  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds['$exists'] = val;
  return this;
};

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
 *       elem.where('author').equals('autobot');
 *       elem.where('votes').gte(5);
 *     })
 *
 * @param {String|Object|Function} path
 * @param {Object|Function} criteria
 * @return {Query} this
 * @api public
 */

Query.prototype.elemMatch = function (path, criteria) {
  var block;
  if ('Object' === path.constructor.name) {
    criteria = path;
    path = this._currPath;
  } else if ('function' === typeof path) {
    block = path;
    path = this._currPath;
  } else if ('Object' === criteria.constructor.name) {
  } else if ('function' === typeof criteria) {
    block = criteria;
  } else {
    throw new Error("Argument error");
  }
  var conds = this._conditions[path] || (this._conditions[path] = {});
  if (block) {
    criteria = new Query();
    block(criteria);
    conds['$elemMatch'] = criteria._conditions;
  } else {
    conds['$elemMatch'] = criteria;
  }
  return this;
};

// Spatial queries

/**
 * Syntax sugar for expressive queries.
 *
 * ####Example
 *
 *     query.within.box()
 *     query.within.center()
 *
 * @property within
 * @memberOf Query
 * @return {Query} this
 * @api public
 */

Object.defineProperty(Query.prototype, 'within', {
  get: function () { return this }
});

/**
 * Specifies a $box condition
 *
 * ####Example
 *
 *     var lowerLeft = [40.73083, -73.99756]
 *     var upperRight= [40.741404,  -73.988135]
 *     query.where('loc').within.box({ ll: lowerLeft , ur: upperRight })
 *
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @see Query#within #query_Query-within
 * @param {String} path
 * @param {Object} val
 * @return {Query} this
 * @api public
 */

Query.prototype.box = function (path, val) {
  if (arguments.length === 1) {
    val = path;
    path = this._currPath;
  }
  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds['$within'] = { '$box': [val.ll, val.ur]  };
  return this;
};

/**
 * Specifies a $center condition
 *
 * ####Example
 *
 *     var area = { center: [50, 50], radius: 10 }
 *     query.where('loc').within.center(area)
 *
 * @param {String} path
 * @param {Object} val
 * @param {Object} [opts] options e.g. { $uniqueDocs: true }
 * @return {Query} this
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

Query.prototype.center = function (path, val, opts) {
  if (arguments.length === 1) {
    val = path;
    path = this._currPath;
  }
  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds['$within'] = { '$center': [val.center, val.radius]  };

  // copy any options
  if (opts && 'Object' == opts.constructor.name) {
    utils.options(opts, conds.$within);
  }

  return this;
};

/**
 * Specifies a $centerSphere condition
 *
 * ####Example
 *
 *     var area = { center: [50, 50], radius: 10 }
 *     query.where('loc').within.centerSphere(area)
 *
 * @param {String} path
 * @param {Object} val
 * @return {Query} this
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

Query.prototype.centerSphere = function (path, val) {
  if (arguments.length === 1) {
    val = path;
    path = this._currPath;
  }
  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds['$within'] = { '$centerSphere': [val.center, val.radius]  };
  return this;
};

/**
 * Specifies a $polygon condition
 *
 * ####Example
 *
 *     var polyA = [ [ 10, 20 ], [ 10, 40 ], [ 30, 40 ], [ 30, 20 ] ]
 *     query.where('loc').within.polygon(polyA)
 *
 *     // or
 *     var polyB = { a : { x : 10, y : 20 }, b : { x : 15, y : 25 }, c : { x : 20, y : 20 } }
 *     query.where('loc').within.polygon(polyB)
 *
 * @param {String} path
 * @param {Array|Object} val
 * @return {Query} this
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @api public
 */

Query.prototype.polygon = function (path, val) {
  if (arguments.length === 1) {
    val = path;
    path = this._currPath;
  }
  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds['$within'] = { '$polygon': val };
  return this;
};

/**
 * Specifies which document fields to include or exclude
 *
 * When using string syntax, prefixing a path with `-` will flag that path as excluded. When a path does not have the `-` prefix, it is included. Lastly, if a path is prefixed with `+`, it forces inclusion of the path, which is useful for paths excluded at the [schema level](/docs/api.html#schematype_SchemaType-select).
 *
 * ####Example
 *
 *     // include a and b, exclude c
 *     query.select('a b -c');
 *
 *     // or you may use object notation, useful when
 *     // you have keys already prefixed with a "-"
 *     query.select({a: 1, b: 1, c: 0});
 *
 *     // force inclusion of field excluded at schema level
 *     query.select('+path')
 *
 * ####NOTE:
 *
 * _v2 had slightly different syntax such as allowing arrays of field names. This support was removed in v3._
 *
 * @param {Object|String} arg
 * @return {Query} this
 * @see SchemaType
 * @api public
 */

Query.prototype.select = function select (arg) {
  if (!arg) return this;

  var fields = this._fields || (this._fields = {});

  if ('Object' === arg.constructor.name) {
    Object.keys(arg).forEach(function (field) {
      fields[field] = arg[field];
    });
  } else if (1 === arguments.length && 'string' == typeof arg) {
    arg.split(/\s+/).forEach(function (field) {
      if (!field) return;
      var include = '-' == field[0] ? 0 : 1;
      if (include === 0) field = field.substring(1);
      fields[field] = include;
    });
  } else {
    throw new TypeError('Invalid select() argument. Must be a string or object.');
  }

  return this;
};

/**
 * Specifies a $slice condition
 *
 * ####Example
 *
 *     query.slice('comments', 5)
 *     query.slice('comments', -5)
 *     query.slice('comments', [10, 5])
 *     query.where('comments').slice(5)
 *     query.where('comments').slice([-10, 5])
 *
 * @param {String} path
 * @param {Number} val number of elements to slice
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/Retrieving+a+Subset+of+Fields#RetrievingaSubsetofFields-RetrievingaSubrangeofArrayElements
 * @api public
 */

Query.prototype.slice = function (path, val) {
  if (arguments.length === 1) {
      val = path;
      path = this._currPath
  } else if (arguments.length === 2) {
    if ('number' === typeof path) {
      val = [path, val];
      path = this._currPath;
    }
  } else if (arguments.length === 3) {
    val = utils.args(arguments, 1);
  }
  var myFields = this._fields || (this._fields = {});
  myFields[path] = { '$slice': val };
  return this;
};

/**
 * Sets the sort order
 *
 * If an object is passed, values allowed are 'asc', 'desc', 'ascending', 'descending', 1, and -1.
 *
 * If a string is passed, it must be a space delimited list of path names. The sort order of each path is ascending unless the path name is prefixed with `-` which will be treated as descending.
 *
 * ####Example
 *
 *     // these are equivalent
 *     query.sort({ field: 'asc', test: -1 });
 *     query.sort('field -test');
 *
 * @param {Object|String} arg
 * @return {Query} this
 * @api public
 */

Query.prototype.sort = function (arg) {
  if (!arg) return this;

  var sort = this.options.sort || (this.options.sort = []);

  if ('Object' === arg.constructor.name) {
    Object.keys(arg).forEach(function (field) {
      push(sort, field, arg[field]);
    });
  } else if (1 === arguments.length && 'string' == typeof arg) {
    arg.split(/\s+/).forEach(function (field) {
      if (!field) return;
      var ascend = '-' == field[0] ? -1 : 1;
      if (ascend === -1) field = field.substring(1);
      push(sort, field, ascend);
    });
  } else {
    throw new TypeError('Invalid sort() argument. Must be a string or object.');
  }

  return this;
};

/*!
 * @ignore
 */

function push (arr, field, value) {
  var val = String(value || 1).toLowerCase();
  if (!/^(?:ascending|asc|descending|desc|1|-1)$/.test(val)) {
    if (Array.isArray(value)) value = '['+value+']';
    throw new TypeError('Invalid sort value: {' + field + ': ' + value + ' }');
  }
  arr.push([field, value]);
}

/**
 * Specifies the limit option.
 *
 * ####Example
 *
 *     Kitten.find().limit(20)
 *
 * @method limit
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Blimit%28%29%7D%7D
 * @api public
 */
/**
 * Specifies the skip option.
 *
 * ####Example
 *
 *     Kitten.find().skip(100).limit(20)
 *
 * @method skip
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bskip%28%29%7D%7D
 * @api public
 */
/**
 * Specifies the maxscan option.
 *
 * ####Example
 *
 *     Kitten.find().maxscan(100)
 *
 * @method maxscan
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24maxScan
 * @api public
 */
/**
 * Specifies the batchSize option.
 *
 * ####Example
 *
 *     Kitten.find().batchSize(100)
 *
 * @method batchSize
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7BbatchSize%28%29%7D%7D
 * @api public
 */
/**
 * Specifies the `comment` option.
 *
 * ####Example
 *
 *     Kitten.findOne(condition).comment('login query')
 *
 * @method comment
 * @memberOf Query
 * @param {Number} val
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24comment
 * @api public
 */

/*!
 * limit, skip, maxscan, batchSize, comment
 *
 * Sets these associated options.
 *
 *     query.comment('feed query');
 */

;['limit', 'skip', 'maxscan', 'batchSize', 'comment'].forEach(function (method) {
  Query.prototype[method] = function (v) {
    this.options[method] = v;
    return this;
  };
});

/**
 * Specifies this query as a `snapshot` query.
 *
 * ####Example
 *
 *     Kitten.find().snapshot()
 *
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%7B%7Bsnapshot%28%29%7D%7D
 * @return {Query} this
 * @api public
 */

Query.prototype.snapshot = function () {
  this.options.snapshot = true;
  return this;
};

/**
 * Sets query hints.
 *
 * ####Example
 *
 *     Model.find().hint({ indexA: 1, indexB: -1})
 *
 * @param {Object} val a hint object
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24hint
 * @api public
 */

Query.prototype.hint = function (val) {
  if (!val) return this;

  var hint = this.options.hint || (this.options.hint = {});

  if ('Object' === val.constructor.name) {
    // must keep object keys in order so don't use Object.keys()
    for (var k in val) {
      hint[k] = val[k];
    }
  } else {
    throw new TypeError('Invalid hint. ' + val);
  }

  return this;
};

/**
 * Sets the slaveOk option.
 *
 * ####Example:
 *
 *     new Query().slaveOk() // true
 *     new Query().slaveOk(true)
 *     new Query().slaveOk(false)
 *
 * @param {Boolean} v defaults to true
 * @see mongodb http://docs.mongodb.org/manual/applications/replication/#read-preference
 * @return {Query} this
 * @api public
 */

Query.prototype.slaveOk = function (v) {
  this.options.slaveOk = arguments.length ? !!v : true;
  return this;
}

/**
 * Sets the readPreference option for the query.
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
 *     // with tags
 *     new Query().read('s', [{ dc:'sf', s: 1 },{ dc:'ma', s: 2 }])
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
 * Read more about how to use read preferrences [here](http://docs.mongodb.org/manual/applications/replication/#read-preference) and [here](http://mongodb.github.com/node-mongodb-native/driver-articles/anintroductionto1_1and2_2.html#read-preferences).
 *
 * @param {String} pref one of the listed preference options or their aliases
 * @param {Array} [tags] optional tags for this query
 * @see mongodb http://docs.mongodb.org/manual/applications/replication/#read-preference
 * @see driver http://mongodb.github.com/node-mongodb-native/driver-articles/anintroductionto1_1and2_2.html#read-preferences
 * @return {Query} this
 * @api public
 */

Query.prototype.read = function (pref, tags) {
  this.options.readPreference = utils.readPref(pref, tags);
  return this;
}

/**
 * Sets the lean option.
 *
 * Documents returned from queries with the `lean` option enabled are plain javascript objects, not [MongooseDocuments](#document-js). They have no `save` method, getters/setters or any other Mongoose magic applied.
 *
 * This is a [great](https://groups.google.com/forum/#!topic/mongoose-orm/u2_DzDydcnA/discussion) option in high-performance read-only scenarios, especially when combined with the [stream](#query_Query-stream) option.
 *
 * ####Example:
 *
 *     new Query().lean() // true
 *     new Query().lean(true)
 *     new Query().lean(false)
 *
 *     Model.find().lean().exec();
 *
 *     var leanStream = Model.find().lean().stream();
 *
 * @param {Boolean} v defaults to true
 * @return {Query} this
 * @api public
 */

Query.prototype.lean = function (v) {
  this.options.lean = arguments.length ? !!v : true;
  return this;
}

/**
 * Sets tailable option.
 *
 * ####Example
 *
 *     Kitten.find().tailable() <== true
 *     Kitten.find().tailable(true)
 *     Kitten.find().tailable(false)
 *
 * @param {Boolean} v defaults to true
 * @see mongodb http://www.mongodb.org/display/DOCS/Tailable+Cursors
 * @api public
 */

Query.prototype.tailable = function (v) {
  this.options.tailable = arguments.length ? !!v : true;
  return this;
};

/**
 * Executes the query as a find() operation.
 *
 * @param {Function} callback
 * @return {Query} this
 * @api private
 */

Query.prototype.execFind = function (callback) {
  var model = this.model
    , promise = new Promise(callback);

  try {
    this.cast(model);
  } catch (err) {
    promise.error(err);
    return this;
  }

  // apply default schematype path selections
  this._applyPaths();

  var self = this
    , castQuery = this._conditions
    , options = this._optionsForExec(model)
    , fields = utils.clone(this._fields)

  options.fields = this._castFields(fields);
  if (options.fields instanceof Error) {
    promise.error(options.fields);
    return this;
  }

  model.collection.find(castQuery, options, function (err, cursor) {
    if (err) return promise.error(err);
    cursor.toArray(tick(cb));
  });

  function cb (err, docs) {
    if (err) return promise.error(err);

    if (true === options.lean)
      return promise.complete(docs);

    var arr = []
      , count = docs.length;

    if (!count) return promise.complete([]);

    for (var i = 0, l = docs.length; i < l; i++) {
      arr[i] = new model(undefined, fields, true);
      arr[i].init(docs[i], self, function (err) {
        if (err) return promise.error(err);
        --count || promise.complete(arr);
      });
    }
  }

  return this;
};

/**
 * Executes the query as a findOne() operation.
 *
 * ####Example
 *
 *     Kitten.where('color', 'white').findOne(function (err, kitten) {
 *       if (err) return handleError(err);
 *
 *       // kitten may be null if no document matched
 *       if (kitten) {
 *         ...
 *       }
 *     })
 *
 * @param {Function} callback
 * @return {Query} this
 * @api public
 */

Query.prototype.findOne = function (callback) {
  this.op = 'findOne';

  if (!callback) return this;

  var model = this.model;
  var promise = new Promise(callback);

  try {
    this.cast(model);
  } catch (err) {
    promise.error(err);
    return this;
  }

  // apply default schematype path selections
  this._applyPaths();

  var self = this
    , castQuery = this._conditions
    , options = this._optionsForExec(model)
    , fields = utils.clone(this._fields)

  options.fields = this._castFields(fields);
  if (options.fields instanceof Error) {
    promise.error(options.fields);
    return this;
  }

  model.collection.findOne(castQuery, options, tick(function (err, doc) {
    if (err) return promise.error(err);
    if (!doc) return promise.complete(null);

    if (true === options.lean) return promise.complete(doc);

    var casted = new model(undefined, fields, true);
    casted.init(doc, self, function (err) {
      if (err) return promise.error(err);
      promise.complete(casted);
    });
  }));

  return this;
};

/**
 * Exectues the query as a count() operation.
 *
 * ####Example
 *
 *     Kitten.where('color', 'black').count(function (err, count) {
 *       if (err) return handleError(err);
 *       console.log('there are %d black kittens', count);
 *     })
 *
 * @param {Function} callback
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/Aggregation#Aggregation-Count
 * @api public
 */

Query.prototype.count = function (callback) {
  this.op = 'count';
  var model = this.model;

  try {
    this.cast(model);
  } catch (err) {
    return callback(err);
  }

  var castQuery = this._conditions;
  model.collection.count(castQuery, tick(callback));

  return this;
};

/**
 * Executes this query as a distict() operation.
 *
 * @param {String} field
 * @param {Function} callback
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/Aggregation#Aggregation-Distinct
 * @api public
 */

Query.prototype.distinct = function (field, callback) {
  this.op = 'distinct';
  var model = this.model;

  try {
    this.cast(model);
  } catch (err) {
    return callback(err);
  }

  var castQuery = this._conditions;
  model.collection.distinct(field, castQuery, tick(callback));

  return this;
};

/*!
 * These operators require casting docs
 * to real Documents for Update operations.
 */

var castOps = {
    $push: 1
  , $pushAll: 1
  , $addToSet: 1
  , $set: 1
};

/*!
 * These operators should be cast to numbers instead
 * of their path schema type.
 */

var numberOps = {
    $pop: 1
  , $unset: 1
  , $inc: 1
}

/**
 * Executes this query as an update() operation.
 *
 * _All paths passed that are not $atomic operations will become $set ops so we retain backwards compatibility._
 *
 * ####Example
 *
 *     Model.update({..}, { title: 'remove words' }, ...)
 *
 * becomes
 *
 *     Model.update({..}, { $set: { title: 'remove words' }}, ...)
 *
 * ####Note
 *
 * Passing an empty object `{}` as the doc will result in a no-op. The update operation will be ignored and the callback executed without sending the command to MongoDB so as to prevent accidently overwritting the collection.
 *
 * @param {Object} doc the update conditions
 * @param {Function} callback
 * @return {Query} this
 * @api public
 */

Query.prototype.update = function update (doc, callback) {
  this.op = 'update';
  this._updateArg = doc;

  var model = this.model
    , options = this._optionsForExec(model)
    , fn = 'function' == typeof callback
    , castedQuery
    , castedDoc

  castedQuery = castQuery(this);
  if (castedQuery instanceof Error) {
    if (fn) {
      process.nextTick(callback.bind(null, castedQuery));
      return this;
    }
    throw castedQuery;
  }

  castedDoc = castDoc(this);
  if (!castedDoc) {
    fn && process.nextTick(callback.bind(null, null, 0));
    return this;
  }

  if (castedDoc instanceof Error) {
    if (fn) {
      process.nextTick(callback.bind(null, castedDoc));
      return this;
    }
    throw castedDoc;
  }

  if (!fn) {
    delete options.safe;
  }

  model.collection.update(castedQuery, castedDoc, options, tick(callback));
  return this;
};

/**
 * Casts obj for an update command.
 *
 * @param {Object} obj
 * @return {Object} obj after casting its values
 * @api private
 */

Query.prototype._castUpdate = function _castUpdate (obj) {
  var ops = Object.keys(obj)
    , i = ops.length
    , ret = {}
    , hasKeys
    , val

  while (i--) {
    var op = ops[i];
    if ('$' !== op[0]) {
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
    } else if ('$set' === op) {
      if (!ret.$set) {
        ret[op] = obj[op];
      }
    } else {
      ret[op] = obj[op];
    }
  }

  // cast each value
  i = ops.length;

  while (i--) {
    op = ops[i];
    val = ret[op];
    if ('Object' === val.constructor.name) {
      hasKeys |= this._walkUpdatePath(val, op);
    } else {
      var msg = 'Invalid atomic update value for ' + op + '. '
              + 'Expected an object, received ' + typeof val;
      throw new Error(msg);
    }
  }

  return hasKeys && ret;
}

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

Query.prototype._walkUpdatePath = function _walkUpdatePath (obj, op, pref) {
  var strict = this.model.schema.options.strict
    , prefix = pref ? pref + '.' : ''
    , keys = Object.keys(obj)
    , i = keys.length
    , hasKeys = false
    , schema
    , key
    , val

  while (i--) {
    key = keys[i];
    val = obj[key];

    if (val && 'Object' === val.constructor.name) {
      // watch for embedded doc schemas
      schema = this._getSchema(prefix + key);
      if (schema && schema.caster && op in castOps) {
        // embedded doc schema

        if (strict && !schema) {
          // path is not in our strict schema
          if ('throw' == strict) {
            throw new Error('Field `' + key + '` is not in schema.');
          } else {
            // ignore paths not specified in schema
            delete obj[key];
          }
        } else {
          hasKeys = true;
          if ('$each' in val) {
            obj[key] = {
                $each: this._castUpdateVal(schema, val.$each, op)
            }
          } else {
            obj[key] = this._castUpdateVal(schema, val, op);
          }
        }
      } else {
        hasKeys |= this._walkUpdatePath(val, op, prefix + key);
      }
    } else {
      schema = '$each' === key
        ? this._getSchema(pref)
        : this._getSchema(prefix + key);

      var skip = strict &&
                 !schema &&
                 !/real|nested/.test(this.model.schema.pathType(prefix + key));

      if (skip) {
        if ('throw' == strict) {
          throw new Error('Field `' + prefix + key + '` is not in schema.');
        } else {
          delete obj[key];
        }
      } else {
        hasKeys = true;
        obj[key] = this._castUpdateVal(schema, val, op, key);
      }
    }
  }
  return hasKeys;
}

/**
 * Casts `val` according to `schema` and atomic `op`.
 *
 * @param {Schema} schema
 * @param {Object} val
 * @param {String} op - the atomic operator ($pull, $set, etc)
 * @param {String} [$conditional]
 * @api private
 */

Query.prototype._castUpdateVal = function _castUpdateVal (schema, val, op, $conditional) {
  if (!schema) {
    // non-existing schema path
    return op in numberOps
      ? Number(val)
      : val
  }

  if (schema.caster && op in castOps &&
    ('Object' === val.constructor.name || Array.isArray(val))) {
    // Cast values for ops that add data to MongoDB.
    // Ensures embedded documents get ObjectIds etc.
    var tmp = schema.cast(val);

    if (Array.isArray(val)) {
      val = tmp;
    } else {
      val = tmp[0];
    }
  }

  if (op in numberOps) return Number(val);
  if (/^\$/.test($conditional)) return schema.castForQuery($conditional, val);
  return schema.castForQuery(val)
}

/**
 * Finds the schema for `path`. This is different than
 * calling `schema.path` as it also resolves paths with
 * positional selectors (something.$.another.$.path).
 *
 * @param {String} path
 * @api private
 */

Query.prototype._getSchema = function _getSchema (path) {
  var schema = this.model.schema
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

/**
 * Casts selected field arguments for field selection with mongo 2.2
 *
 *     query.select({ ids: { $elemMatch: { $in: [hexString] }})
 *
 * @param {Object} fields
 * @see https://github.com/LearnBoost/mongoose/issues/1091
 * @see http://docs.mongodb.org/manual/reference/projection/elemMatch/
 * @api private
 */

Query.prototype._castFields = function _castFields (fields) {
  var selected
    , elemMatchKeys
    , keys
    , key
    , out
    , i

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
}

/**
 * Executes this query as a remove() operation.
 *
 * ####Example
 *
 *     Cassette.where('artist').equals('Anne Murray').remove(callback)
 *
 * @param {Function} callback
 * @api public
 */

Query.prototype.remove = function (callback) {
  this.op = 'remove';

  var model = this.model
    , options = this._optionsForExec(model)
    , cb = 'function' == typeof callback

  try {
    this.cast(model);
  } catch (err) {
    if (cb) return callback(err);
    throw err;
  }

  if (!cb) {
    delete options.safe;
  }

  var castQuery = this._conditions;
  model.collection.remove(castQuery, options, tick(callback));
  return this;
};

/**
 * Issues a mongodb [findAndModify](http://www.mongodb.org/display/DOCS/findAndModify+Command) update command.
 *
 * Finds a matching document, updates it according to the `update` arg, passing any `options`, and returns the found document (if any) to the callback. The query executes immediately if `callback` is passed else a Query object is returned.
 *
 * ####Available options
 *
 * - `new`: bool - true to return the modified document rather than the original. defaults to true
 * - `upsert`: bool - creates the object if it doesn't exist. defaults to false.
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 *
 * ####Examples
 *
 *     query.findOneAndUpdate(conditions, update, options, callback) // executes
 *     query.findOneAndUpdate(conditions, update, options)  // returns Query
 *     query.findOneAndUpdate(conditions, update, callback) // executes
 *     query.findOneAndUpdate(conditions, update)           // returns Query
 *     query.findOneAndUpdate(callback)                     // executes
 *     query.findOneAndUpdate()                             // returns Query
 *
 * @param {Object} [query]
 * @param {Object} [doc]
 * @param {Object} [options]
 * @param {Function} [callback]
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @return {Query} this
 * @api public
 */

Query.prototype.findOneAndUpdate = function (query, doc, options, callback) {
  this.op = 'findOneAndUpdate';

  switch (arguments.length) {
    case 3:
      if ('function' == typeof options)
        callback = options, options = {};
      break;
    case 2:
      if ('function' == typeof doc) {
        callback = doc;
        doc = query;
        query = undefined;
      }
      options = undefined;
      break;
    case 1:
      if ('function' == typeof query) {
        callback = query;
        query = options = doc = undefined;
      } else {
        doc = query;
        query = options = undefined;
      }
  }

  // apply query
  if (query) {
    if ('Object' === query.constructor.name) {
      merge(this._conditions, query);
    } else if (query instanceof Query) {
      merge(this._conditions, query._conditions);
    } else if (query instanceof Document) {
      merge(this._conditions, query.toObject());
    }
  }

  // apply doc
  if (doc) {
    merge(this._updateArg, doc);
  }

  // apply options
  options && this.setOptions(options);

  if (!callback) return this;

  return this._findAndModify('update', callback);
}

/**
 * Issues a mongodb [findAndModify](http://www.mongodb.org/display/DOCS/findAndModify+Command) remove command.
 *
 * Finds a matching document, removes it, passing the found document (if any) to the callback. Executes immediately if `callback` is passed else a Query object is returned.
 *
 * ####Available options
 *
 * - `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
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
 * @param {Object} [conditions]
 * @param {Object} [options]
 * @param {Function} [callback]
 * @return {Query} this
 * @see mongodb http://www.mongodb.org/display/DOCS/findAndModify+Command
 * @api public
 */

Query.prototype.findOneAndRemove = function (conditions, options, callback) {
  this.op = 'findOneAndRemove';

  if ('function' == typeof options) {
    callback = options;
    options = undefined;
  } else if ('function' == typeof conditions) {
    callback = conditions;
    conditions = undefined;
  }

  // apply conditions
  if (conditions) {
    if ('Object' === conditions.constructor.name) {
      merge(this._conditions, conditions);
    } else if (conditions instanceof Query) {
      merge(this._conditions, conditions._conditions);
    } else if (conditions instanceof Document) {
      merge(this._conditions, conditions.toObject());
    }
  }

  // apply options
  options && this.setOptions(options);

  if (!callback) return this;

  return this._findAndModify('remove', callback);
}

/**
 * _findAndModify
 *
 * @param {String} type - either "remove" or "update"
 * @param {Function} callback
 * @api private
 */

Query.prototype._findAndModify = function (type, callback) {
  var model = this.model
    , promise = new Promise(callback)
    , self = this
    , castedQuery
    , castedDoc
    , fields
    , sort
    , opts

  castedQuery = castQuery(this);
  if (castedQuery instanceof Error) {
    process.nextTick(promise.error.bind(promise, castedQuery));
    return promise;
  }

  opts = this._optionsForExec(model);

  if ('remove' == type) {
    opts.remove = true;
  } else {
    if (!('new' in opts)) opts.new = true;
    if (!('upsert' in opts)) opts.upsert = false;

    castedDoc = castDoc(this);
    if (!castedDoc) {
      if (opts.upsert) {
        // still need to do the upsert to empty doc
        castedDoc = { $set: {} };
      } else {
        return this.findOne(callback);
      }
    } else if (castedDoc instanceof Error) {
      process.nextTick(promise.error.bind(promise, castedDoc));
      return promise;
    }
  }

  this._applyPaths();

  if (this._fields) {
    fields = utils.clone(this._fields)
    opts.fields = this._castFields(fields);
    if (opts.fields instanceof Error) {
      process.nextTick(promise.error.bind(promise, opts.fields));
      return promise;
    }
  }

  // the driver needs a default
  sort = opts.sort || [];

  model
  .collection
  .findAndModify(castedQuery, sort, castedDoc, opts, tick(function (err, doc) {
    if (err) return promise.error(err);
    if (!doc) return promise.complete(null);

    if (true === opts.lean) {
      return promise.complete(doc);
    }

    var casted = new model(undefined, fields, true);
    casted.init(doc, self, function (err) {
      if (err) return promise.error(err);
      promise.complete(casted);
    });
  }));

  return promise;
}

/**
 * Specifies paths which should be populated with other documents.
 *
 * Paths are populated after the query executes and a response is received. A separate query is then executed for each path specified for population. After a response for each query has also been returned, the results are passed to the callback.
 *
 * ####Example:
 *
 *     Kitten.findOne().populate('owner').exec(function (err, kitten) {
 *       console.log(kitten.owner.name) // Max
 *     })
 *
 * @param {String} path
 * @param {Object|String} [fields]
 * @param {Model} [model]
 * @param {Object} [conditions]
 * @param {Object} [options]
 * @see population ./populate.html
 * @see Query#select #query_Query-select
 * @return {Query} this
 * @api public
 */

Query.prototype.populate = function (path, fields, model, conditions, options) {
  if ('string' !== typeof model) {
    options = conditions;
    conditions = model;
    model = undefined;
  }
  // The order of fields/conditions args is opposite Model.find but
  // necessary to keep backward compatibility (fields could be
  // an array, string, or object literal).
  this.options.populate[path] =
    new PopulateOptions(fields, conditions, options, model);

  return this;
};

/*!
 * Populate options constructor
 */

function PopulateOptions (fields, conditions, options, model) {
  this.conditions = conditions;
  this.fields = fields;
  this.options = options;
  this.model = model;
}

// make it compatible with utils.clone
PopulateOptions.prototype.constructor = Object;

/**
 * Returns a stream interface
 *
 * ####Example
 *
 *     // follows the nodejs stream api
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
 * @return {QueryStream}
 * @see QueryStream
 * @api public
 */

Query.prototype.stream = function stream () {
  return new QueryStream(this);
}

// helpers

/*!
 * castDoc
 * @api private
 */

function castDoc (query) {
  try {
    return query._castUpdate(query._updateArg);
  } catch (err) {
    return err;
  }
}

/*!
 * castQuery
 * @api private
 */

function castQuery (query) {
  try {
    return query.cast(query.model);
  } catch (err) {
    return err;
  }
}

/*!
 * Exports.
 */

module.exports = Query;
module.exports.QueryStream = QueryStream;
