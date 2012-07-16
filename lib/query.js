/**
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

/**
 * Query constructor
 *
 * @api private
 */

function Query (criteria, options) {
  this.setOptions(options, true);
  this._conditions = {};
  this._updateArg = {};
  if (criteria) this.find(criteria);
}

/**
 * setOptions
 *
 * Sets query options.
 *
 * @param {Object} options
 * @api public
 */

Query.prototype.setOptions = function (options, overwrite /*internal*/) {
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
 * @param {Model} model - the model to which the query is bound
 * @param {String} op - the operation to execute
 * @param {Object} updateArg - used in update methods
 * @return {Query}
 * @api public
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
 * exec
 *
 * Executes the query returning a promise.
 *
 * Examples:
 *
 *     query.exec();
 *     query.exec(callback);
 *     query.exec('update');
 *     query.exec('find', callback);
 *
 * @param {String|Function} op (optional)
 * @param {Function} callback (optional)
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
 * @param {Object} criteria
 * @param {Function} callback
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
 * Casts obj, or if obj is not present, then this._conditions,
 * based on the model's schema.
 *
 * @param {Function} model
 * @param {Object} obj (optional)
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
 * @api private
 */

Query.prototype._optionsForExec = function (model) {
  var options = utils.clone(this.options, { retainKeyOrder: true });
  delete options.populate;
  if (! ('safe' in options)) options.safe = model.schema.options.safe;
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

  this.model.schema.eachPath(function (path, type) {
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
  });

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
}

/**
 * $where
 *
 * Sometimes you need to query for things in mongodb using a JavaScript
 * expression. You can do so via find({$where: javascript}), or you can
 * use the mongoose shortcut method $where via a Query chain or from
 * your mongoose Model.
 *
 * @param {String|Function} js is a javascript string or anonymous function
 * @return {Query}
 * @api public
 */

Query.prototype.$where = function (js) {
  this._conditions['$where'] = js;
  return this;
};

/**
 * where
 *
 * Sugar for query.find().
 *
 * For example, instead of writing:
 *
 *     User.find({age: {$gte: 21, $lte: 65}}, callback);
 *
 * we can instead write:
 *
 *     User.where('age').gte(21).lte(65);
 *
 * Moreover, you can also chain a bunch of these together:
 *
 *     User
 *    .where('age').gte(21).lte(65)
 *    .where('name', /^b/i)        // All names that begin where b or B
 *    .where('friends').slice(10);
 *
 * @param {String} path
 * @param {Object} val (optional)
 * @TODO deprecate?
 * @return {Query}
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
 * `equals` sugar.
 *
 *     User.where('age').equals(49);
 *
 * Same as
 *
 *     User.where('age', 49);
 *
 * @param {object} val
 * @return {Query}
 * @api public
 */

Query.prototype.equals = function equals (val) {
  var path = this._currPath;
  if (!path) throw new Error('equals() must be used after where()');
  this._conditions[path] = val;
  return this;
}

/**
 * or
 */

Query.prototype.or = function or (array) {
  var or = this._conditions.$or || (this._conditions.$or = []);
  if (!Array.isArray(array)) array = [array];
  or.push.apply(or, array);
  return this;
}

/**
 * nor
 */

Query.prototype.nor = function nor (array) {
  var nor = this._conditions.$nor || (this._conditions.$nor = []);
  if (!Array.isArray(array)) array = [array];
  nor.push.apply(nor, array);
  return this;
}

/**
 * gt, gte, lt, lte, ne, in, nin, all, regex, size, maxDistance
 *
 * Can be used on Numbers or Dates.
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
 * mod, near
 */

;['mod', 'near'].forEach(function ($conditional) {
  Query.prototype[$conditional] = function (path, val) {
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
    conds['$' + $conditional] = val;
    return this;
  };
});

/**
 * exists
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
 * elemMatch
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
 * within
 *
 * Example:
 *
 *     query.within.box()
 *     query.within.center()
 *
 * @return {this}
 */

Object.defineProperty(Query.prototype, 'within', {
  get: function () { return this }
});

/**
 * box
 *
 * Specifies a $box query.
 *
 * Example:
 *
 *     var lowerLeft = [40.73083, -73.99756]
 *     var upperRight= [40.741404,  -73.988135]
 *     query.where('loc').within.box({ ll: lowerLeft , ur: upperRight })
 *
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @param {String} path
 * @param {Object} val
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
 * center
 *
 * Specifies a $center query.
 *
 * Example:
 *
 *     var area = { center: [50, 50], radius: 10 }
 *     query.where('loc').within.center(area)
 *
 * @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
 * @param {String} path
 * @param {Object} val
 */

Query.prototype.center = function (path, val) {
  if (arguments.length === 1) {
    val = path;
    path = this._currPath;
  }
  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds['$within'] = { '$center': [val.center, val.radius]  };
  return this;
};

/**
 * centerSphere
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
 * select
 *
 * Specifies which fields to include or exclude from
 * the document that is returned from MongoDB.
 *
 * Example:
 *
 *     query.select('a b -c');
 *     query.select({a: 1, b: 1, c: 0}); // useful if you have keys that start with "-"
 *     query.select('+path') // force inclusion of field excluded at schema level
 *
 * @param {Object|String}
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
 * slice()
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
 * sort
 *
 * Sets the sort order. Accepts a single parameter, either an object or string.
 * If an object is passed values allowed are 'asc', 'desc', 'ascending', 'descending', 1, -1.
 * If a string is passed it must be a space delimited list of path names. The sort order of each path is ascending unless the path name is prefixed with `-` which will be treated as descending.
 *
 * Examples:
 *
 *     // these are equivalent
 *     query.sort({ field: 'asc', test: -1 });
 *     query.sort('field -test');
 *
 * @param {Object|String}
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

/**
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
 * limit, skip, maxscan, snapshot, batchSize, comment
 *
 * Sets these associated options.
 *
 *     query.comment('feed query');
 */

;['limit', 'skip', 'maxscan', 'snapshot', 'batchSize', 'comment'].forEach(function (method) {
  Query.prototype[method] = function (v) {
    this.options[method] = v;
    return this;
  };
});

/**
 * hint
 *
 * Sets query hints.
 *
 * Examples:
 *
 *     new Query().hint({ indexA: 1, indexB: -1})
 *
 * @param {Object} val
 * @return {Query}
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
 * slaveOk
 *
 * Sets slaveOk option.
 *
 *     new Query().slaveOk() <== true
 *     new Query().slaveOk(true)
 *     new Query().slaveOk(false)
 *
 * @param {Boolean} v (defaults to true)
 * @api public
 */

Query.prototype.slaveOk = function (v) {
  this.options.slaveOk = arguments.length ? !!v : true;
  return this;
};

/**
 * tailable
 *
 * Sets tailable option.
 *
 *     new Query().tailable() <== true
 *     new Query().tailable(true)
 *     new Query().tailable(false)
 *
 * @param {Boolean} v (defaults to true)
 * @api public
 */

Query.prototype.tailable = function (v) {
  this.options.tailable = arguments.length ? !!v : true;
  return this;
};

/**
 * execFind
 *
 * @api private
 */

Query.prototype.execFind = function (callback) {
  var model = this.model
    , promise = new Promise(callback);

  try {
    this.cast(model);
  } catch (err) {
    return promise.error(err);
  }

  // apply default schematype path selections
  this._applyPaths();

  var self = this
    , castQuery = this._conditions
    , options = this._optionsForExec(model)

  var fields = utils.clone(options.fields = this._fields);

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
 * findOne
 *
 * Casts the query, sends the findOne command to mongodb.
 * Upon receiving the document, we initialize a mongoose
 * document based on the returned document from mongodb,
 * and then we invoke a callback on our mongoose document.
 *
 * @param {Function} callback function (err, found)
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

  var fields = utils.clone(options.fields = this._fields);

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
 * count
 *
 * Casts this._conditions and sends a count
 * command to mongodb. Invokes a callback upon
 * receiving results
 *
 * @param {Function} callback fn(err, cardinality)
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
 * distinct
 *
 * Casts this._conditions and sends a distinct
 * command to mongodb. Invokes a callback upon
 * receiving results
 *
 * @param {Function} callback fn(err, cardinality)
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

/**
 * These operators require casting docs
 * to real Documents for Update operations.
 * @private
 */

var castOps = {
    $push: 1
  , $pushAll: 1
  , $addToSet: 1
  , $set: 1
};

/**
 * These operators should be cast to numbers instead
 * of their path schema type.
 * @private
 */

var numberOps = {
    $pop: 1
  , $unset: 1
  , $inc: 1
}

/**
 * update
 *
 * Casts the `doc` according to the model Schema and
 * sends an update command to MongoDB.
 *
 * _All paths passed that are not $atomic operations
 * will become $set ops so we retain backwards compatibility._
 *
 * Example:
 *
 * `Model.update({..}, { title: 'remove words' }, ...)`
 *
 *   becomes
 *
 * `Model.update({..}, { $set: { title: 'remove words' }}, ...)`
 *
 *
 * _Passing an empty object `{}` as the doc will result
 * in a no-op. The update operation will be ignored and the
 * callback executed without sending the command to MongoDB so as
 * to prevent accidently overwritting the collection._
 *
 * @param {Object} doc - the update
 * @param {Function} callback - fn(err)
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
 * @private
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
 * @private
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
 * @private
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
 * remove
 *
 * Casts the query, sends the remove command to
 * mongodb where the query contents, and then
 * invokes a callback upon receiving the command
 * result.
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
 * findOneAndUpdate
 *
 * Issues a mongodb findAndModify update command.
 *
 * Finds a matching document, updates it according to the `update`
 * arg, passing any `options`, and returns the found document
 * (if any) to the callback. The query executes immediately if
 * `callback` is passed else a Query object is returned.
 *
 * Available options:
 *
 *   `new`: bool - true to return the modified document rather than the original. defaults to true
 *   `upsert`: bool - creates the object if it doesn't exist. defaults to false.
 *   `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 *
 * Examples:
 *
 *     query.findOneAndUpdate(conditions, update, options, callback) // executes
 *     query.findOneAndUpdate(conditions, update, options)  // returns Query
 *     query.findOneAndUpdate(conditions, update, callback) // executes
 *     query.findOneAndUpdate(conditions, update)           // returns Query
 *     query.findOneAndUpdate(callback)                     // executes
 *     query.findOneAndUpdate()                             // returns Query
 *
 * @param {Object} query
 * @param {Object} doc
 * @param {Object} options
 * @param {Function} callback
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
 * findOneAndRemove
 *
 * Issues a mongodb findAndModify remove command.
 *
 * Finds a matching document, removes it, passing the found
 * document (if any) to the callback. Executes immediately if `callback`
 * is passed else a Query object is returned.
 *
 * Available options:
 *
 *   `sort`: if multiple docs are found by the conditions, sets the sort order to choose which doc to update
 *
 * Examples:
 *
 *     A.where().findOneAndRemove(conditions, options, callback) // executes
 *     A.where().findOneAndRemove(conditions, options)  // return Query
 *     A.where().findOneAndRemove(conditions, callback) // executes
 *     A.where().findOneAndRemove(conditions) // returns Query
 *     A.where().findOneAndRemove(callback)   // executes
 *     A.where().findOneAndRemove()           // returns Query
 *
 * @param {Object} conditions
 * @param {Object} options
 * @param {Function} callback
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

  if (this._fields) {
    fields = utils.clone(opts.fields = this._fields);
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
 * populate
 *
 * Sets population options.
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

/**
 * Populate options constructor
 * @private
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
 * stream
 *
 * Returns a stream interface
 *
 * Example:
 *     Thing.find({ name: /^hello/ }).stream().pipe(res)
 *
 * @api public
 */

Query.prototype.stream = function stream () {
  return new QueryStream(this);
}

// helpers

/**
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

/**
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

/**
 * Exports.
 */

module.exports = Query;
module.exports.QueryStream = QueryStream;
