//Model.remove = function (query, callback) {
//  var self = this;
//  this.query(query).callback(callback).onExecute( function () {
//  });
//};
//
//Model.findOne = function (criteria, fields, callback) {
//  var query = new Query(criteria, fields);
//  query.bind(this.schema).run(callback);
//};
//
//Model.find = function (criteria, fields, callback) {
//};
//
//function BoundQuery (query, schema) {
//  this.query = query;
//  this.schema = schema;
//  this._cast();
//};
//
//BoundQuery.prototype.cast = function () {
//};

var utils = require('./utils')
  , merge = utils.merge
  , inGroupsOf = utils.inGroupsOf;

function Query (criteria, options) {
  this.criteria = criteria || {};
  options = this.options = options || {};
  this.safe = options.safe
  this.$conditionals = {};
  this._conditions = {};
}

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

Query.prototype.cast = function (schema) {
  var criteria = this.criteria
    , paths = Object.keys(criteria)
    , i = paths.length, path, val;
  while (i--) {
    path = paths[i];
    val = criteria[path];
  }
}

Query.prototype.callback = function (fn) {
  this._callback = fn;
  return this;
};

Query.prototype.$where = function (js) {
  this._conditions['$where'] = js;
  return this;
};

Query.prototype.exec =
Query.prototype.run = function (fn) {
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
Query.prototype.fields = function () {
  var arg0 = arguments[0];
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

['limit', 'skip', 'maxscan', 'snapshot'].forEach( function (method) {
  Query.prototype[method] = function (v) {
    this.options[method] = v;
    return this;
  };
});

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
  var sort = this.options.sort || (this.options.sort = [])
    , args = [].slice.call(arguments);
  inGroupsOf(2, args, function (field, value) {
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

// TODO
Query.prototype.explain = function () {
  throw new Error("Unimplemented");
};

// TODO Add being able to skip casting -- e.g., this would be nice for scenarios like
// if you're migrating to usernames from user id numbers:
// query.with('user_id').in([4444, 'brian']);

// TODO "immortal" cursors

exports.Query = Query;
