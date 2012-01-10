/**
 * Module dependencies.
 */

var utils = require('./utils')
  , merge = utils.merge
  , Promise = require('./promise')
  , Document = require('./document')
  , inGroupsOf = utils.inGroupsOf
  , tick = utils.tick
  , QueryStream = require('./querystream')

/**
 * Query constructor
 *
 * @api private
 */

function Query (criteria, options) {
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

  this._conditions = {};
  if (criteria) this.find(criteria);
}

/**
 * Binds this query to a model.
 * @param {Function} param
 * @return {Query}
 * @api public
 */

Query.prototype.bind = function bind (model, op, updateArg) {
  this.model = model;
  this.op = op;
  if (op === 'update') this._updateArg = updateArg;
  return this;
};

/**
 * Executes the query returning a promise.
 *
 * Examples:
 * query.run();
 * query.run(callback);
 * query.run('update');
 * query.run('find', callback);
 *
 * @param {String|Function} op (optional)
 * @param {Function} callback (optional)
 * @return {Promise}
 * @api public
 */

Query.prototype.run =
Query.prototype.exec = function (op, callback) {
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
    this.update(this._updateArg, promise.resolve.bind(promise));
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
          return k.charAt(0) === '$';
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
};

/**
 * Returns default options.
 * @api private
 */

Query.prototype._optionsForExec = function (model) {
  var options = utils.clone(this.options, { retainKeyOrder: true });
  delete options.populate;
  if (! ('safe' in options)) options.safe = model.options.safe;
  return options;
};

/**
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
 * `where` enables a very nice sugary api for doing your queries.
 * For example, instead of writing:
 *     User.find({age: {$gte: 21, $lte: 65}}, callback);
 * we can instead write more readably:
 *     User.where('age').gte(21).lte(65);
 * Moreover, you can also chain a bunch of these together like:
 *     User
 *       .where('age').gte(21).lte(65)
 *       .where('name', /^b/i)        // All names that begin where b or B
 *       .where('friends').slice(10);
 * @param {String} path
 * @param {Object} val (optional)
 * @return {Query}
 * @api public
 */

Query.prototype.where = function (path, val) {
  if (2 === arguments.length) {
    this._conditions[path] = val;
  }
  this._currPath = path;
  return this;
};

Query.prototype.or =
Query.prototype.$or = function $or (array) {
  var or = this._conditions.$or || (this._conditions.$or = []);
  if (!Array.isArray(array)) array = [array];
  or.push.apply(or, array);
  return this;
}

Query.prototype.nor =
Query.prototype.$nor = function $nor (array) {
  var nor = this._conditions.$nor || (this._conditions.$nor = []);
  if (!Array.isArray(array)) array = [array];
  nor.push.apply(nor, array);
  return this;
}

// $lt, $lte, $gt, $gte can be used on Numbers or Dates
'gt gte lt lte ne in nin all regex size maxDistance'.split(' ').forEach( function ($conditional) {
  Query.prototype['$' + $conditional] =
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

Query.prototype.notEqualTo = Query.prototype.ne;

;['mod', 'near'].forEach( function ($conditional) {
  Query.prototype['$' + $conditional] =
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

Query.prototype['$exists'] =
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

Query.prototype['$elemMatch'] =
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

/**
 * @private
 */

function me () { return this }

/**
 * Spatial queries
 */

// query.within.box()
// query.within.center()
var within = 'within $within'.split(' ');
within.push('wherein', '$wherein'); // deprecated, an old mistake possibly?
within.forEach(function (getter) {
  Object.defineProperty(Query.prototype, getter, {
    get: me
  });
});

Query.prototype['$box'] =
Query.prototype.box = function (path, val) {
  if (arguments.length === 1) {
    val = path;
    path = this._currPath;
  }
  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds['$within'] = { '$box': [val.ll, val.ur]  };
  return this;
};

Query.prototype['$center'] =
Query.prototype.center = function (path, val) {
  if (arguments.length === 1) {
    val = path;
    path = this._currPath;
  }
  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds['$within'] = { '$center': [val.center, val.radius]  };
  return this;
};

Query.prototype['$centerSphere'] =
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
 * Chainable method for specifying which fields
 * to include or exclude from the document that is
 * returned from MongoDB.
 *
 * Examples:
 * query.fields({a: 1, b: 1, c: 1, _id: 0});
 * query.fields('a b c');
 *
 * @param {Object}
 */

Query.prototype.select =
Query.prototype.fields = function () {
  var arg0 = arguments[0];
  if (!arg0) return this;
  if ('Object' === arg0.constructor.name || Array.isArray(arg0)) {
    this._applyFields(arg0);
  } else if (arguments.length === 1 && typeof arg0 === 'string') {
    this._applyFields({only: arg0});
  } else {
    this._applyFields({only: this._parseOnlyExcludeFields.apply(this, arguments)});
  }
  return this;
};

/**
 * Chainable method for adding the specified fields to the
 * object of fields to only include.
 *
 * Examples:
 * query.only('a b c');
 * query.only('a', 'b', 'c');
 * query.only(['a', 'b', 'c']);
 * @param {String|Array} space separated list of fields OR
 *                       an array of field names
 * We can also take arguments as the "array" of field names
 * @api public
 */

Query.prototype.only = function (fields) {
  fields = this._parseOnlyExcludeFields.apply(this, arguments);
  this._applyFields({ only: fields });
  return this;
};

/**
 * Chainable method for adding the specified fields to the
 * object of fields to exclude.
 *
 * Examples:
 * query.exclude('a b c');
 * query.exclude('a', 'b', 'c');
 * query.exclude(['a', 'b', 'c']);
 * @param {String|Array} space separated list of fields OR
 *                       an array of field names
 * We can also take arguments as the "array" of field names
 * @api public
 */

Query.prototype.exclude = function (fields) {
  fields = this._parseOnlyExcludeFields.apply(this, arguments);
  this._applyFields({ exclude: fields });
  return this;
};

Query.prototype['$slice'] =
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
 * Private method for interpreting the different ways
 * you can pass in fields to both Query.prototype.only
 * and Query.prototype.exclude.
 *
 * @param {String|Array|Object} fields
 * @api private
 */

Query.prototype._parseOnlyExcludeFields = function (fields) {
  if (1 === arguments.length && 'string' === typeof fields) {
    fields = fields.split(' ');
  } else if (Array.isArray(fields)) {
    // do nothing
  } else {
    fields = utils.args(arguments);
  }
  return fields;
};

/**
 * Private method for interpreting and applying the different
 * ways you can specify which fields you want to include
 * or exclude.
 *
 * Example 1: Include fields 'a', 'b', and 'c' via an Array
 * query.fields('a', 'b', 'c');
 * query.fields(['a', 'b', 'c']);
 *
 * Example 2: Include fields via 'only' shortcut
 * query.only('a b c');
 *
 * Example 3: Exclude fields via 'exclude' shortcut
 * query.exclude('a b c');
 *
 * Example 4: Include fields via MongoDB's native format
 * query.fields({a: 1, b: 1, c: 1})
 *
 * Example 5: Exclude fields via MongoDB's native format
 * query.fields({a: 0, b: 0, c: 0});
 *
 * @param {Object|Array} the formatted collection of fields to
 *                       include and/or exclude
 * @api private
 */

Query.prototype._applyFields = function (fields) {
  var $fields
    , pathList;

  if (Array.isArray(fields)) {
    $fields = fields.reduce(function ($fields, field) {
      $fields[field] = 1;
      return $fields;
    }, {});
  } else if (pathList = fields.only || fields.exclude) {
    $fields =
      this._parseOnlyExcludeFields(pathList)
        .reduce(function ($fields, field) {
          $fields[field] = fields.only ? 1: 0;
          return $fields;
        }, {});
  } else if ('Object' === fields.constructor.name) {
    $fields = fields;
  } else {
    throw new Error("fields is invalid");
  }

  var myFields = this._fields || (this._fields = {});
  for (var k in $fields) myFields[k] = $fields[k];
};

/**
 * Sets the sort
 *
 * Examples:
 *     query.sort('test', 1)
 *     query.sort('field', -1)
 *     query.sort('field', -1, 'test', 1)
 *
 * @api public
 */

Query.prototype.sort = function () {
  var sort = this.options.sort || (this.options.sort = []);

  inGroupsOf(2, arguments, function (field, value) {
    sort.push([field, value]);
  });

  return this;
};

Query.prototype.asc = function () {
  var sort = this.options.sort || (this.options.sort = []);
  for (var i = 0, l = arguments.length; i < l; i++) {
    sort.push([arguments[i], 1]);
  }
  return this;
};

Query.prototype.desc = function () {
  var sort = this.options.sort || (this.options.sort = []);
  for (var i = 0, l = arguments.length; i < l; i++) {
    sort.push([arguments[i], -1]);
  }
  return this;
};

;['limit', 'skip', 'maxscan', 'snapshot', 'batchSize'].forEach( function (method) {
  Query.prototype[method] = function (v) {
    this.options[method] = v;
    return this;
  };
});

/**
 * Query hints.
 *
 * Examples:
 *   new Query().hint({ indexA: 1, indexB: -1})
 *   new Query().hint("indexA", 1, "indexB", -1)
 *
 * @param {Object|String} v
 * @param {Int} [multi]
 * @return {Query}
 * @api public
 */

Query.prototype.hint = function (v, multi) {
  var hint = this.options.hint || (this.options.hint = {})
    , k

  if (multi) {
    inGroupsOf(2, arguments, function (field, val) {
      hint[field] = val;
    });
  } else if ('Object' === v.constructor.name) {
    // must keep object keys in order so don't use Object.keys()
    for (k in v) {
      hint[k] = v[k];
    }
  }

  return this;
};

/**
 * Sets slaveOk option
 *
 *   new Query().slaveOk() <== true
 *   new Query().slaveOk(true)
 *   new Query().slaveOk(false)
 *
 * @param {Boolean} v (defaults to true)
 */

Query.prototype.slaveOk = function (v) {
  this.options.slaveOk = arguments.length ? !!v : true;
  return this;
};

Query.prototype.execFind = function (callback) {
  var model = this.model
    , options = this._optionsForExec(model)
    , self = this

  var promise = new Promise(callback);

  try {
    this.cast(model);
  } catch (err) {
    return promise.error(err);
  }

  var fields = utils.clone(options.fields = this._fields);
  var castQuery = this._conditions;

  model.collection.find(castQuery, options, function (err, cursor) {
    if (err) return promise.error(err);
    cursor.toArray(tick(cb));
  });

  function cb (err, docs) {
    if (err) return promise.error(err);

    var arr = []
      , count = docs.length;

    if (!count) return promise.complete([]);

    for (var i = 0, l = docs.length; i < l; i++) {
      arr[i] = new model(undefined, fields);

      // skip _id for pre-init hooks
      delete arr[i]._doc._id;

      arr[i].init(docs[i], self, function (err) {
        if (err) return promise.error(err);
        --count || promise.complete(arr);
      });
    }
  }

  return this;
};

/**
 * Streaming cursors.
 *
 * The `callback` is called repeatedly for each document
 * found in the collection as it's streamed. If an error
 * occurs streaming stops.
 *
 * Example:
 * query.each(function (err, user) {
 *   if (err) return res.end("aww, received an error. all done.");
 *   if (user) {
 *     res.write(user.name + '\n')
 *   } else {
 *     res.end("reached end of cursor. all done.");
 *   }
 * });
 *
 * A third parameter may also be used in the callback which
 * allows you to iterate the cursor manually.
 *
 * Example:
 * query.each(function (err, user, next) {
 *   if (err) return res.end("aww, received an error. all done.");
 *   if (user) {
 *     res.write(user.name + '\n')
 *     doSomethingAsync(next);
 *   } else {
 *     res.end("reached end of cursor. all done.");
 *   }
 * });
 *
 * @param {Function} callback
 * @return {Query}
 * @api public
 */

Query.prototype.each = function (callback) {
  var model = this.model
    , options = this._optionsForExec(model)
    , manual = 3 == callback.length
    , self = this

  try {
    this.cast(model);
  } catch (err) {
    return callback(err);
  }

  var fields = utils.clone(options.fields = this._fields);

  function complete (err, val) {
    if (complete.ran) return;
    complete.ran = true;
    callback(err, val);
  }

  model.collection.find(this._conditions, options, function (err, cursor) {
    if (err) return complete(err);

    var ticks = 0;
    next();

    function next () {
      // nextTick is necessary to avoid stack overflows when
      // dealing with large result sets. yield occasionally.
      if (!(++ticks % 20)) {
        process.nextTick(function () {
          cursor.nextObject(onNextObject);
        });
      } else {
        cursor.nextObject(onNextObject);
      }
    }

    function onNextObject (err, doc) {
      if (err) return complete(err);

      // when doc is null we hit the end of the cursor
      if (!doc) return complete(null, null);

      var instance = new model(undefined, fields);

      // skip _id for pre-init hooks
      delete instance._doc._id;

      instance.init(doc, self, function (err) {
        if (err) return complete(err);

        if (manual) {
          callback(null, instance, next);
        } else {
          callback(null, instance);
          next();
        }
      });
    }

  });

  return this;
}

/**
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

  var self = this
    , castQuery = this._conditions
    , options = this._optionsForExec(model)

  var fields = utils.clone(options.fields = this._fields);

  model.collection.findOne(castQuery, options, tick(function (err, doc) {
    if (err) return promise.error(err);
    if (!doc) return promise.complete(null);

    var casted = new model(undefined, fields);

    // skip _id for pre-init hooks
    delete casted._doc._id;

    casted.init(doc, self, function (err) {
      if (err) return promise.error(err);
      promise.complete(casted);
    });
  }));

  return this;
};

/**
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
 * Casts the `doc` according to the model Schema and
 * sends an update command to MongoDB.
 *
 * _All paths passed that are not $atomic operations
 * will become $set ops so we retain backwards compatibility._
 *
 * Example:
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
    , useSet = model.options['use$SetOnSave']
    , castQuery
    , castDoc

  try {
    this.cast(model);
    castQuery = this._conditions;
  } catch (err) {
    return callback(err);
  }

  try {
    castDoc = this._castUpdate(doc);
  } catch (err) {
    return callback(err);
  }

  if (castDoc) {
    model.collection.update(castQuery, castDoc, options, tick(callback));
  } else {
    process.nextTick(function () {
      callback(null);
    });
  }

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
    hasKeys = true;
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
      this._walkUpdatePath(val, op);
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
 * @private
 */

Query.prototype._walkUpdatePath = function _walkUpdatePath (obj, op, pref) {
  var prefix = pref ? pref + '.' : ''
    , keys = Object.keys(obj)
    , i = keys.length
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
        if ('$each' in val) {
          obj[key] = {
              $each: this._castUpdateVal(schema, val.$each, op)
          }
        } else {
          obj[key] = this._castUpdateVal(schema, val, op);
        }
      } else {
        this._walkUpdatePath(val, op, prefix + key);
      }
    } else {
      schema = '$each' === key
        ? this._getSchema(pref)
        : this._getSchema(prefix + key);

      obj[key] = this._castUpdateVal(schema, val, op);
    }
  }
}

/**
 * Casts `val` according to `schema` and atomic `op`.
 *
 * @param {Schema} schema
 * @param {Object} val
 * @param {String} op - the atomic operator ($pull, $set, etc)
 * @private
 */

Query.prototype._castUpdateVal = function _castUpdateVal (schema, val, op) {
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

  return op in numberOps
    ? Number(val)
    : schema.castForQuery(val)
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
    , options = this._optionsForExec(model);

  try {
    this.cast(model);
  } catch (err) {
    return callback(err);
  }

  var castQuery = this._conditions;
  model.collection.remove(castQuery, options, tick(callback));
  return this;
};

/**
 * Sets population options.
 * @api public
 */

Query.prototype.populate = function (path, fields, conditions, options) {
  // The order of fields/conditions args is opposite Model.find but
  // necessary to keep backward compatibility (fields could be
  // an array, string, or object literal).
  this.options.populate[path] =
    new PopulateOptions(fields, conditions, options);

  return this;
};

/**
 * Populate options constructor
 * @private
 */

function PopulateOptions (fields, conditions, options) {
  this.conditions = conditions;
  this.fields = fields;
  this.options = options;
}

// make it compatible with utils.clone
PopulateOptions.prototype.constructor = Object;

/**
 * Returns a stream interface
 *
 * Example:
 *  Thing.find({ name: /^hello/ }).stream().pipe(res)
 *
 * @api public
 */

Query.prototype.stream = function stream () {
  return new QueryStream(this);
}

/**
 * @private
 * @TODO
 */

Query.prototype.explain = function () {
  throw new Error("Unimplemented");
};

// TODO Add being able to skip casting -- e.g., this would be nice for scenarios like
// if you're migrating to usernames from user id numbers:
// query.where('user_id').in([4444, 'brian']);
// TODO "immortal" cursors - (only work on capped collections)
// TODO geoNear command

/**
 * Exports.
 */

module.exports = Query;
module.exports.QueryStream = QueryStream;
