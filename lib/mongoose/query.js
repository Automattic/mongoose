var utils = require('./utils')
  , merge = utils.merge
  , Promise = require('./promise')
  , inGroupsOf = utils.inGroupsOf;

/**
 * Query constructor
 *
 * @api private
 */

function Query (criteria, options) {
  options = this.options = options || {};
  this.safe = options.safe
  this._conditions = {};
  if (criteria) this.find(criteria);
}

/**
 * Spawns a new query that's bound to a new model.
 * @param {Function} param
 * @return {Query}
 * @api public
 */

Query.prototype.bind = function (model, op, updateArg) {
  var ret = Object.create(this);
  ret.model = model;
  ret.op = op;
  if (op === 'update') this._updateArg = updateArg;
  return ret;
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

  this[this.op](promise.resolve.bind(promise));
  return promise;
};

Query.prototype.find = function (criteria, callback) {
  this.op = 'find';
  if ('function' === typeof criteria) {
    callback = criteria;
    criteria = {};
  } else if (criteria instanceof Query) {
    // TODO Merge options, too
    merge(this._conditions, criteria._conditions);
  } else {
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

    if (path === '$or') {
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
          remainingConds = {};
          pathLastHalf = split.slice(j).join('.');
          remainingConds[pathLastHalf] = val;
          castingQuery = new Query(remainingConds);
          castingQuery.cast(model, schematype.caster);
          obj[path] = castingQuery._conditions[pathLastHalf];
        }

      } else if (val === null || val === undefined) {
        continue;
      } else if (val.constructor == Object) {

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

            if ('$ne' === $cond && null === $cond) {
              continue;
            }

            if ('$exists' === $cond) {
              if ('boolean' !== typeof nested) {
                throw new Error("$exists parameter must be Boolean");
              }
              continue;
            }

            if ('$not' === $cond) {
              this.cast(model, val[$cond]);
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

Query.prototype._optionsForExec = function (model) {
  var options = utils.clone(this.options);
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
  var conds;
  if (arguments.length === 2) {
    this._conditions[path] = val;
  }
  this._currPath = path;
  return this;
};

// $lt, $lte, $gt, $gte can be used on Numbers or Dates
['gt', 'gte', 'lt', 'lte', 'ne', 'in', 'nin', 'all', 'size'].forEach( function ($conditional) {
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

['mod', 'near'].forEach( function ($conditional) {
  Query.prototype['$' + $conditional] =
  Query.prototype[$conditional] = function (path, val) {
    if (arguments.length === 1) {
      val = path;
      path = this._currPath
    } else if (arguments.length === 2 && !Array.isArray(val)) {
      val = [].slice.call(arguments);
      path = this._currPath;
    } else if (arguments.length === 3) {
      val = [].slice.call(arguments, 1);
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
  if (path.constructor === Object) {
    criteria = path;
    path = this._currPath;
  } else if ('function' === typeof path) {
    block = path;
    path = this._currPath;
  } else if (criteria.constructor === Object) {
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

['maxscan'].forEach( function (method) {
  Query.prototype[method] = function (v) {
    this.options[method] = v;
    return this;
  };
});

// TODO
Query.prototype.explain = function () {
  throw new Error("Unimplemented");
};

// TODO Add being able to skip casting -- e.g., this would be nice for scenarios like
// if you're migrating to usernames from user id numbers:
// query.where('user_id').in([4444, 'brian']);

// TODO "immortal" cursors - (only work on capped collections)
// TODO geoNear command

// To be used idiomatically where Query#box and Query#center
['wherein', '$wherein'].forEach(function (getter) {
  Object.defineProperty(Query.prototype, getter, {
    get: function () {
      return this;
    }
  });
});

Query.prototype['$box'] =
Query.prototype.box = function (path, val) {
  if (arguments.length === 1) {
    val = path;
    path = this._currPath;
  }
  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds['$wherein'] = { '$box': [val.ll, val.ur]  };
  return this;
};

Query.prototype['$center'] =
Query.prototype.center = function (path, val) {
  if (arguments.length === 1) {
    val = path;
    path = this._currPath;
  }
  var conds = this._conditions[path] || (this._conditions[path] = {});
  conds['$wherein'] = { '$center': [val.center, val.radius]  };
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
  if (arg0.constructor === Object || Array.isArray(arg0)) {
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
    val = [].slice.call(arguments, 1);
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
    fields = [].slice.call(arguments);
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
  } else if (fields.constructor === Object) {
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

['limit', 'skip', 'maxscan', 'snapshot'].forEach( function (method) {
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
  } else if (v.constructor === Object) {
    // must keep object keys in order so don't use Object.keys()
    for (k in v) {
      hint[k] = v[k];
    }
  }

  return this;
};

Query.prototype.execFind = function (callback) {
  var model = this.model
    , options = this._optionsForExec(model);
  options.fields = this._fields;

  try {
    this.cast(model);
  } catch (err) {
    return callback(err);
  }

  var castQuery = this._conditions;

  model.collection.find(castQuery, options, function (err, cursor) {
    if (err) return callback(err);

    cursor.toArray(function (err, docs) {
      if (err) return callback(err);

      var arr = []
        , count = docs.length;

      if (!count) return callback(null, []);

      for (var i = 0, l = docs.length; i < l; i++) {
        arr[i] = new model();
        arr[i].init(docs[i], function (err) {
          if (err) return callback(err);
          --count || callback(null, arr);
        });
      }
    });
  });

  return this;
};

/**
 * Steaming cursors.
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

  options.fields = this._fields;

  try {
    this.cast(model);
  } catch (err) {
    return callback(err);
  }

  function complete (err, val) {
    if (complete.ran) return;
    complete.ran = true;
    callback(err, val);
  }

  model.collection.find(this._conditions, options, function (err, cursor) {
    if (err) return complete(err);

    next();

    function next () {
      // nextTick is necessary to avoid stack overflows when
      // dealing with large result sets.
      process.nextTick(function () {
        cursor.nextObject(onNextObject);
      });
    }

    function onNextObject (err, doc) {
      if (err) return complete(err);

      // when doc is null we hit the end of the cursor 
      if (!doc) return complete(null, null);

      var instance = new model;

      instance.init(doc, function (err) {
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
  var model = this.model;
  var options = this._optionsForExec(model);

  options.fields = this._fields;

  this.cast(model);
  var castQuery = this._conditions;

  model.collection.findOne(castQuery, options, function (err, doc) {
    if (err) return callback(err);
    if (!doc) return callback(null, null);

    var casted = new model();
    casted.init(doc, function (err) {
      if (err) return callback(err);
      callback(null, casted);
    });
  });

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
  this.cast(model);
  var castQuery = this._conditions;
  model.collection.count(castQuery, callback);
  return this;
};

/**
 * Casts the query, sends the update command to mongodb.
 * If there is an error, the callback handles it. Otherwise,
 * we just invoke the callback whereout passing it an error.
 *
 * @param {Function} callback fn(err)
 * @api public
 */

Query.prototype.update = function (doc, callback) {
  this.op = 'update';
  this._updateArg = doc;

  var model = this.model
    , options = this._optionsForExec(model)
    , useSet = model.options['use$SetOnSave'];

  this.cast(model);
  var castQuery = this._conditions;

  var castingQuery = {_conditions: doc};
  this.cast.call(castingQuery, model);
  var castDoc = castingQuery._conditions;

  if (useSet) {
    castDoc = {'$set': castDoc};
  }

  model.collection.update(castQuery, castDoc, options, callback);
  return this;
};

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
  var model = this.model;
  this.cast(model);
  var castQuery = this._conditions;
  model.collection.remove(castQuery, callback);
  return this;
};

module.exports = Query;
