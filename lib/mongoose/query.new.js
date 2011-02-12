var utils = require('./utils')
  , merge = utils.merge
  , inGroupsOf = utils.inGroupsOf
  , Promise = require('./promise');

/**
 * Query constructor
 *
 * @api private
 */

function Query (criteria, options) {
  Promise.call(this); // TODO Do we even need Promise?
  options = this.options = options || {};
  this.safe = options.safe
  this._conditions = {};
  if (criteria) this.find(criteria);
}

/**
 * Inherits from Promise.
 */

Query.prototype.__proto__ = Promise.prototype;

Query.prototype.bind = function (schema) {
//  var bound = Object.create(this);
  var bound = new BoundQuery(this, schema);
  return bound;
};

Query.prototype.find = function (criteria) {
  var conds = this._conditions;
  merge(conds, criteria);
  return this;
};

Query.prototype.cast = function (model, obj) {
  obj || (obj= this._conditions);

  var schema = model.schema
    , paths = Object.keys(obj)
    , i = paths.length, path, val, schematype, nested
    , any$conditionals;
  while (i--) {
    path = paths[i];
    val = obj[path];

    if (path === '$not') {
      this.cast(model, val); // val instanceof Object
    } else if (path === '$or') {
      throw new Error("Unimplemented"); // TODO
    } else {
      schematype = schema.path(path);

      if (val.constructor == Object) {
        any$conditionals = Object.keys(val).some( function (k) {
          return k.charAt(0) === '$';
        });
        if (!any$conditionals) {
          obj[path] = schematype.castForQuery(val);
        } else for (var $cond in val) {
          nested = val[$cond];
          if ($cond === '$ne' && nested === null) {
            continue;
          } else if ($cond === '$exists') {
            if ('boolean' !== typeof nested)
              throw new Error("$exists parameter must be Boolean");
            continue;
          } else {
            val[$cond] = schematype.castForQuery($cond, nested);
          }
        }
      } else if (val === null || val === undefined) {
        continue;
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

Query.prototype.$where = function (js) {
  this._conditions['$where'] = js;
  return this;
};

Query.prototype.with = function (path, val) {
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
// query.with('user_id').in([4444, 'brian']);

// TODO "immortal" cursors
// TODO geoNear command

// To be used idiomatically with Query#box and Query#center
['within', '$within'].forEach( function (getter) {
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

function FindQuery (criteria, fields, options) {
  Query.call(this, criteria, options);
  this.fields(fields);
}

FindQuery.prototype.__proto__ = Query.prototype;

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
FindQuery.prototype.select =
FindQuery.prototype.fields = function () {
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
FindQuery.prototype.only = function (fields) {
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
FindQuery.prototype.exclude = function (fields) {
  fields = this._parseOnlyExcludeFields.apply(this, arguments);
  this._applyFields({ exclude: fields });
  return this;
};

FindQuery.prototype['$slice'] =
FindQuery.prototype.slice = function (path, val) {
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
 * you can pass in fields to both FindQuery.prototype.only
 * and FindQuery.prototype.exclude.
 *
 * @param {String|Array|Object} fields
 * @api private
 */
FindQuery.prototype._parseOnlyExcludeFields = function (fields) {
  if (1 === arguments.length && 'string' === typeof fields) {
    fields = fields.split(' ');
  } else if (Array.isArray(fields)) {
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
FindQuery.prototype._applyFields = function (fields) {
  var $fields
    , pathList;
  if (Array.isArray(fields)) {
    $fields = 
      fields.reduce( function ($fields, field) {
        $fields[field] = 1;
        return $fields;
      }, {});
  } else if (pathList = fields.only || fields.exclude) {
    $fields = 
      this._parseOnlyExcludeFields(pathList)
        .reduce( function ($fields, field) {
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

FindQuery.prototype.sort = function () {
  var sort = this.options.sort || (this.options.sort = [])
    , args = [].slice.call(arguments);
  inGroupsOf(2, args, function (field, value) {
    sort.push([field, value]);
  });
  return this;
};

FindQuery.prototype.asc = function () {
  var sort = this.options.sort || (this.options.sort = []);
  for (var i = 0, l = arguments.length; i < l; i++) {
    sort.push([arguments[i], 1]);
  }
  return this;
};

FindQuery.prototype.desc = function () {
  var sort = this.options.sort || (this.options.sort = []);
  for (var i = 0, l = arguments.length; i < l; i++) {
    sort.push([arguments[i], -1]);
  }
  return this;
};

['limit', 'skip', 'maxscan', 'snapshot'].forEach( function (method) {
  FindQuery.prototype[method] = function (v) {
    this.options[method] = v;
    return this;
  };
});

FindQuery.prototype.exec =
FindQuery.prototype.run = function (model, callback) {
  var options = this._optionsForExec(model);
  options.fields = this._fields;

  this.cast(model);
  var castQuery = this._conditions;

  model.collection.find(castQuery, options, function (err, cursor) {
    if (err) return callback(err);

    cursor.toArray( function (err, docs) {
      if (err) callback(err);

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
};

function FindOneQuery (conditions, fields, options) {
  FindQuery.apply(this, arguments);
}

FindOneQuery.prototype.__proto__ = FindQuery.prototype;

FindOneQuery.prototype.exec =
FindOneQuery.prototype.run = function (model, callback) {
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
};

function CountQuery () {
  Query.apply(this, arguments);
}

CountQuery.prototype.__proto__ = Query.prototype;

CountQuery.prototype.exec =
CountQuery.prototype.run = function (model, callback) {
  this.cast(model);
  var castQuery = this._conditions;
  model.collection.count(castQuery, callback);
};

function UpdateQuery (criteria, doc, options) {
  Query.call(this, criteria, options);
  this.doc = doc;
}

UpdateQuery.prototype.__proto__ = Query.prototype;

UpdateQuery.prototype.exec = 
UpdateQuery.prototype.run = function (model, callback) {
  var options = this._optionsForExec(model);

  this.cast(model);
  var castQuery = this._conditions;

  this.cast.call(this.doc, model);
  var castDoc = this.doc;

  model.collection.update(castQuery, castDoc, options, callback);
};

function RemoveQuery (conditions) {
  Query.call(this, conditions);
}

RemoveQuery.prototype.__proto__ = Query.prototype;

RemoveQuery.prototype.exec =
RemoveQuery.prototype.run = function (model, callback) {
  this.cast(model);
  var castQuery = this._conditions;
  model.collection.remove(castQuery, callback);
};

//function BoundQuery (query, schema) {
//  this.query = query;
//  this.schema = schema;
//  this._cast();
//};
//
//BoundQuery.prototype = {
//  cast: function () {
//  },
//  exec: function (callback) {
//    var query = this.query
//      , model = this.model
//      , casted; // TODO
//    if (query._fields) {
//      query.options.fields = query._fields;
//    }
//    if (query instanceof FindOneQuery) {
//    } else if (query instanceof FindQuery) {
//    } else if (query instanceof UpdateQuery) {
//      model.collection.update(castQuery, castDoc, options, callback);
//    } else if (query instanceof CountQuery) {
//    }
//  }
//};
//BoundQuery.prototype.run = BoundQuery.prototype.exec;

exports.Query = Query;
exports.FindQuery = FindQuery;
exports.FindOneQuery = FindOneQuery;
exports.UpdateQuery = UpdateQuery;
exports.CountQuery = CountQuery;
exports.RemoveQuery = RemoveQuery;
