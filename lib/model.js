
/**
 * Module dependencies.
 */

var Document = require('./document')
  , MongooseArray = require('./types/array')
  , MongooseBuffer = require('./types/buffer')
  , MongooseError = require('./error')
  , Query = require('./query')
  , utils = require('./utils')
  , isMongooseObject = utils.isMongooseObject
  , EventEmitter = utils.EventEmitter
  , merge = utils.merge
  , Promise = require('./promise')
  , tick = utils.tick

/**
 * Model constructor
 *
 * @param {Object} values to set
 * @api public
 */

function Model (doc, fields) {
  Document.call(this, doc, fields);
};

/**
 * Inherits from Document.
 */

Model.prototype.__proto__ = Document.prototype;

/**
 * Connection the model uses. Set by the Connection or if absent set to the
 * default mongoose connection;
 *
 * @api public
 */

Model.prototype.db;

/**
 * Collection the model uses. Set by Mongoose instance
 *
 * @api public
 */

Model.prototype.collection;

/**
 * Model name.
 *
 * @api public
 */

Model.prototype.modelName;

/**
 * Returns what paths can be populated
 *
 * @param {query} query object
 * @return {Object] population paths
 * @api private
 */

Model.prototype._getPopulationKeys = function getPopulationKeys (query) {
  if (!(query && query.options.populate)) return;

  var names = Object.keys(query.options.populate)
    , n = names.length
    , name
    , paths = {}
    , hasKeys
    , schema

  while (n--) {
    name = names[n];
    schema = this.schema.path(name);
    hasKeys = true;

    if (!schema) {
      // if the path is not recognized, it's potentially embedded docs
      // walk path atoms from right to left to find a matching path
      var pieces = name.split('.')
        , i = pieces.length;

      while (i--) {
        var path = pieces.slice(0, i).join('.')
          , pathSchema = this.schema.path(path);

        // loop until we find an array schema
        if (pathSchema && pathSchema.caster) {
          if (!paths[path]) {
            paths[path] = { sub: {} };
          }

          paths[path].sub[pieces.slice(i).join('.')] = query.options.populate[name];
          hasKeys || (hasKeys = true);
          break;
        }
      }
    } else {
      paths[name] = query.options.populate[name];
      hasKeys || (hasKeys = true);
    }
  }

  return hasKeys && paths;
};

/**
 * Populates an object
 *
 * @param {SchemaType} schema type for the oid
 * @param {Object} object id or array of object ids
 * @param {Object} object specifying query conditions, fields, and options
 * @param {Function} callback
 * @api private
 */

Model.prototype._populate = function populate (schema, oid, query, fn) {
  if (!Array.isArray(oid)) {
    var conditions = query.conditions || {};
    conditions._id = oid;

    return this
    .model(schema.options.ref)
    .findOne(conditions, query.fields, query.options, fn);
  }

  if (!oid.length) {
    return fn(null, oid);
  }

  var model = this.model(schema.caster.options.ref)
    , conditions = query && query.conditions || {};
  conditions._id || (conditions._id = { $in: oid });

  model.find(conditions, query.fields, query.options, function (err, docs) {
    if (err) return fn(err);

    // user specified sort order?
    if (query.options && query.options.sort) {
      return fn(null, docs);
    }

    // put back in original id order (using a hash reduces complexity from n*n to 2n)
    var docHash = {};
    docs.forEach(function (doc) {
      docHash[doc._id] = doc;
    });

    var arr = [];
    oid.forEach(function (id) {
      if (id in docHash) arr.push(docHash[id]);
    });

    fn(null, arr);
  });
};

/**
 * Performs auto-population of relations.
 *
 * @param {Object} document returned by mongo
 * @param {Query} query that originated the initialization
 * @param {Function} callback
 * @api private
 */

Model.prototype.init = function init (doc, query, fn) {
  if ('function' == typeof query) {
    fn = query;
    query = null;
  }

  var populate = this._getPopulationKeys(query);

  if (!populate) {
    return Document.prototype.init.call(this, doc, fn);
  }

  // population from other models is necessary
  var self = this;

  init(doc, '', function (err) {
    if (err) return fn(err);
    Document.prototype.init.call(self, doc, fn);
  });

  return this;

  function init (obj, prefix, fn) {
    prefix = prefix || '';

    var keys = Object.keys(obj)
      , len = keys.length;

    function next () {
      if (--len < 0) return fn();

      var i = keys[len]
        , path = prefix + i
        , schema = self.schema.path(path)
        , total = 0
        , poppath

      if (!schema && obj[i] && 'Object' === obj[i].constructor.name) {
        // assume nested object
        return init(obj[i], path + '.', next);
      }

      if (!(obj[i] && schema && populate[path])) return next();

      // this query object is re-used and passed around. we clone
      // it to prevent query condition contamination between
      // one populate call to the next.
      poppath = utils.clone(populate[path]);

      if (poppath.sub) {
        obj[i].forEach(function (subobj) {
          var pkeys = Object.keys(poppath.sub)
            , pi = pkeys.length
            , key

          while (pi--) {
            key = pkeys[pi];

            if (subobj[key]) (function (key) {

              total++;
              self._populate(schema.schema.path(key), subobj[key], poppath.sub[key], done);
              function done (err, doc) {
                if (err) return error(err);
                subobj[key] = doc;
                --total || next();
              }
            })(key);
          }
        });

        if (0 === total) return next();

      } else {
        self._populate(schema, obj[i], poppath, function (err, doc) {
          if (err) return error(err);
          obj[i] = doc;
          next();
        });
      }
    };

    next();
  };

  function error (err) {
    if (error.err) return;
    fn(error.err = err);
  }
};

function handleSave (promise, self) {
  return tick(function handleSave (err, result) {
    if (err) {
      // If the initial insert fails provide a second chance.
      // (If we did this all the time we would break updates)
      if (self._inserting) {
        self.isNew = true;
        self.emit('isNew', true);
      }
      return promise.error(err);
    }

    self._storeShard();

    var numAffected;
    if (result) {
      numAffected = result.length
        ? result.length
        : result;
    } else {
      numAffected = 0;
    }

    self.emit('save', self, numAffected);
    promise.complete(self, numAffected);
    promise = null;
    self = null;
  });
}

/**
 * Saves this document.
 *
 * @see Model#registerHooks
 * @param {Function} fn
 * @api public
 */

Model.prototype.save = function save (fn) {
  var promise = new Promise(fn)
    , complete = handleSave(promise, this)
    , options = {}

  if (this.options.safe) {
    options.safe = this.options.safe;
  }

  if (this.isNew) {
    // send entire doc
    this.collection.insert(this.toObject({ depopulate: 1 }), options, complete);
    this._reset();
    this.isNew = false;
    this.emit('isNew', false);
    // Make it possible to retry the insert
    this._inserting = true;

  } else {
    // Make sure we don't treat it as a new object on error,
    // since it already exists
    this._inserting = false;

    var delta = this._delta();
    this._reset();

    if (delta) {
      var where = this._where();
      this.collection.update(where, delta, options, complete);
    } else {
      complete(null);
    }

    this.emit('isNew', false);
  }
};

/**
 * Produces a special query document of the modified properties.
 * @api private
 */

Model.prototype._delta = function _delta () {
  var dirty = this._dirty();
  if (!dirty.length) return;

  var self = this;

  return dirty.reduce(function (delta, data) {
    var type = data.value
      , schema = data.schema
      , atomics
      , val
      , obj

    if (type === undefined) {
      if (!delta.$unset) delta.$unset = {};
      delta.$unset[data.path] = 1;

    } else if (type === null) {
      if (!delta.$set) delta.$set = {};
      delta.$set[data.path] = type;

    } else if (type._path && type.doAtomics) {
      // a MongooseArray or MongooseNumber
      atomics = type._atomics;

      var ops = Object.keys(atomics)
        , i = ops.length
        , op;

      while (i--) {
        op = ops[i]

        if (op === '$pushAll' || op === '$pullAll') {
          if (atomics[op].length === 1) {
            val = atomics[op][0];
            delete atomics[op];
            op = op.replace('All', '');
            atomics[op] = val;
          }
        }

        val = atomics[op];
        obj = delta[op] = delta[op] || {};

        if (op === '$pull' || op === '$push') {
          if ('Object' !== val.constructor.name) {
            if (Array.isArray(val)) val = [val];
            // TODO Should we place pull and push casting into the pull and push methods?
            val = schema.cast(val)[0];
          }
        }

        obj[data.path] = isMongooseObject(val)
          ? val.toObject({ depopulate: 1 }) // MongooseArray
          : Array.isArray(val)
            ? val.map(function (mem) {
                return isMongooseObject(mem)
                  ? mem.toObject({ depopulate: 1 })
                  : mem.valueOf
                    ? mem.valueOf()
                    : mem;
              })
            : val.valueOf
              ? val.valueOf() // Numbers
              : val;

        if ('$addToSet' === op) {
          if (val.length > 1) {
            obj[data.path] = { $each: obj[data.path] };
          } else {
            obj[data.path] = obj[data.path][0];
          }
        }
      }
    } else {
      if (type instanceof MongooseArray ||
          type instanceof MongooseBuffer) {
        type = type.toObject({ depopulate: 1 });
      } else if (type._path) {
        type = type.valueOf();
      } else {
        // nested object literal
        type = utils.clone(type);
      }

      if (!('$set' in delta))
        delta.$set = {};

      delta.$set[data.path] = type;
    }

    return delta;
  }, {});
}

/**
 * _where
 *
 * Returns a query object which applies shardkeys if
 * they exist.
 *
 * @private
 */

Model.prototype._where = function _where () {
  var where = {};

  if (this._shardval) {
    var paths = Object.keys(this._shardval)
      , len = paths.length

    for (var i = 0; i < len; ++i) {
      where[paths[i]] = this._shardval[paths[i]];
    }
  }

  var id = this._doc._id.valueOf // MongooseNumber
    ? this._doc._id.valueOf()
    : this._doc._id;

  where._id = id;
  return where;
}

/**
 * Remove the document
 *
 * @param {Function} callback
 * @api public
 */

Model.prototype.remove = function remove (fn) {
  if (this._removing) return this;

  var promise = this._removing = new Promise(fn)
    , where = this._where()
    , self = this
    , options = {}

  if (this.options.safe) {
    options.safe = this.options.safe;
  }

  this.collection.remove(where, options, tick(function (err) {
    if (err) {
      promise.error(err);
      promise = self = self._removing = where = options = null;
      return;
    }
    promise.complete();
    self.emit('remove', self);
    promise = self = where = options = null;
  }));

  return this;
};

/**
 * Register hooks override
 *
 * @api private
 */

Model.prototype._registerHooks = function registerHooks () {
  Document.prototype._registerHooks.call(this);
};

/**
 * Shortcut to access another model.
 *
 * @param {String} model name
 * @api public
 */

Model.prototype.model = function model (name) {
  return this.db.model(name);
};

/**
 * Access the options defined in the schema
 *
 * @api private
 */

Model.prototype.__defineGetter__('options', function () {
  return this.schema ? this.schema.options : {};
});

/**
 * Give the constructor the ability to emit events.
 */

for (var i in EventEmitter.prototype)
  Model[i] = EventEmitter.prototype[i];

/**
 * Called when the model compiles
 *
 * @api private
 */

Model.init = function init () {
  // build indexes
  var self = this
    , indexes = this.schema.indexes
    , safe = this.schema.options.safe
    , count = indexes.length;

  indexes.forEach(function (index) {
    var options = index[1];
    options.safe = safe;
    self.collection.ensureIndex(index[0], options, tick(function (err) {
      if (err) return self.db.emit('error', err);
      --count || self.emit('index');
    }));
  });

  this.schema.emit('init', this);
};

/**
 * Document schema
 *
 * @api public
 */

Model.schema;

/**
 * Database instance the model uses.
 *
 * @api public
 */

Model.db;

/**
 * Collection the model uses.
 *
 * @api public
 */

Model.collection;

/**
 * Define properties that access the prototype.
 */

['db', 'collection', 'schema', 'options', 'model'].forEach(function(prop){
  Model.__defineGetter__(prop, function(){
    return this.prototype[prop];
  });
});

/**
 * Module exports.
 */

module.exports = exports = Model;

Model.remove = function remove (conditions, callback) {
  if ('function' === typeof conditions) {
    callback = conditions;
    conditions = {};
  }

  var query = new Query(conditions).bind(this, 'remove');

  if ('undefined' === typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.remove(callback);
};

/**
 * Finds documents
 *
 * Examples:
 *    // retrieve only certain keys
 *    MyModel.find({ name: /john/i }, ['name', 'friends'], function () { })
 *
 *    // pass options
 *    MyModel.find({ name: /john/i }, [], { skip: 10 } )
 *
 * @param {Object} conditions
 * @param {Object/Function} (optional) fields to hydrate or callback
 * @param {Function} callback
 * @api public
 */

Model.find = function find (conditions, fields, options, callback) {
  if ('function' == typeof conditions) {
    callback = conditions;
    conditions = {};
    fields = null;
    options = null;
  } else if ('function' == typeof fields) {
    callback = fields;
    fields = null;
    options = null;
  } else if ('function' == typeof options) {
    callback = options;
    options = null;
  }

  var query = new Query(conditions, options);
  query.bind(this, 'find');
  query.select(fields);

  if ('undefined' === typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.find(callback);
};

/**
 * Merges the current named scope query into `query`.
 *
 * @param {Query} query
 * @api private
 */

Model._applyNamedScope = function _applyNamedScope (query) {
  var cQuery = this._cumulativeQuery;

  if (cQuery) {
    merge(query._conditions, cQuery._conditions);
    if (query._fields && cQuery._fields)
      merge(query._fields, cQuery._fields);
    if (query.options && cQuery.options)
      merge(query.options, cQuery.options);
    delete this._cumulativeQuery;
  }

  return query;
}

/**
 * Finds by id
 *
 * @param {ObjectId/Object} objectid, or a value that can be casted to it
 * @api public
 */

Model.findById = function findById (id, fields, options, callback) {
  return this.findOne({ _id: id }, fields, options, callback);
};

/**
 * Finds one document
 *
 * @param {Object} conditions
 * @param {Object/Function} (optional) fields to hydrate or callback
 * @param {Function} callback
 * @api public
 */

Model.findOne = function findOne (conditions, fields, options, callback) {
  if ('function' == typeof options) {
    // TODO Handle all 3 of the following scenarios
    // Hint: Only some of these scenarios are possible if cQuery is present
    // Scenario: findOne(conditions, fields, callback);
    // Scenario: findOne(fields, options, callback);
    // Scenario: findOne(conditions, options, callback);
    callback = options;
    options = null;
  } else if ('function' == typeof fields) {
    // TODO Handle all 2 of the following scenarios
    // Scenario: findOne(conditions, callback)
    // Scenario: findOne(fields, callback)
    // Scenario: findOne(options, callback);
    callback = fields;
    fields = null;
    options = null;
  } else if ('function' == typeof conditions) {
    callback = conditions;
    conditions = {};
    fields = null;
    options = null;
  }

  var query = new Query(conditions, options).select(fields).bind(this, 'findOne');

  if ('undefined' == typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.findOne(callback);
};

/**
 * Counts documents
 *
 * @param {Object} conditions
 * @param {Function} optional callback
 * @api public
 */

Model.count = function count (conditions, callback) {
  if ('function' === typeof conditions)
    callback = conditions, conditions = {};

  var query = new Query(conditions).bind(this, 'count');
  if ('undefined' == typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.count(callback);
};

Model.distinct = function distinct (field, conditions, callback) {
  var query = new Query(conditions).bind(this, 'distinct');
  if ('undefined' == typeof callback) {
    query._distinctArg = field;
    return query;
  }

  this._applyNamedScope(query);
  return query.distinct(field, callback);
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

Model.where = function where (path, val) {
  var q = new Query().bind(this, 'find');
  return q.where.apply(q, arguments);
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

Model.$where = function $where () {
  var q = new Query().bind(this, 'find');
  return q.$where.apply(q, arguments);
};

/**
 * Shortcut for creating a new Document that is automatically saved
 * to the db if valid.
 *
 * @param {Object} doc
 * @param {Function} callback
 * @api public
 */

Model.create = function create (doc, fn) {
  if (1 === arguments.length) {
    return 'function' === typeof doc && doc(null);
  }

  var self = this
    , docs = [null]
    , promise
    , count
    , args

  if (Array.isArray(doc)) {
    args = doc;
  } else {
    args = utils.args(arguments, 0, arguments.length - 1);
    fn = arguments[arguments.length - 1];
  }

  if (0 === args.length) return fn(null);

  promise = new Promise(fn);
  count = args.length;

  args.forEach(function (arg, i) {
    var doc = new self(arg);
    docs[i+1] = doc;
    doc.save(function (err) {
      if (err) return promise.error(err);
      --count || fn.apply(null, docs);
    });
  });

  // TODO
  // utilize collection.insertAll for batch processing?
};

/**
 * Updates documents.
 *
 * Examples:
 *
 *     MyModel.update({ age: { $gt: 18 } }, { oldEnough: true }, fn);
 *     MyModel.update({ name: 'Tobi' }, { ferret: true }, { multi: true }, fn);
 *
 * Valid options:
 *
 *  - safe (boolean) safe mode (defaults to value set in schema (true))
 *  - upsert (boolean) whether to create the doc if it doesn't match (false)
 *  - multi (boolean) whether multiple documents should be updated (false)
 *
 * @param {Object} conditions
 * @param {Object} doc
 * @param {Object} options
 * @param {Function} callback
 * @return {Query}
 * @api public
 */

Model.update = function update (conditions, doc, options, callback) {
  if (arguments.length < 4) {
    if ('function' === typeof options) {
      // Scenario: update(conditions, doc, callback)
      callback = options;
      options = null;
    } else if ('function' === typeof doc) {
      // Scenario: update(doc, callback);
      callback = doc;
      doc = conditions;
      conditions = {};
      options = null;
    }
  }

  var query = new Query(conditions, options).bind(this, 'update', doc);

  if ('undefined' == typeof callback)
    return query;

  this._applyNamedScope(query);
  return query.update(doc, callback);
};

/**
 * Compiler utility.
 *
 * @param {String} model name
 * @param {Schema} schema object
 * @param {String} collection name
 * @param {Connection} connection to use
 * @param {Mongoose} mongoose instance
 * @api private
 */

Model.compile = function compile (name, schema, collectionName, connection, base) {
  // generate new class
  function model () {
    Model.apply(this, arguments);
  };

  model.modelName = name;
  model.__proto__ = Model;
  model.prototype.__proto__ = Model.prototype;
  model.prototype.base = base;
  model.prototype.schema = schema;
  model.prototype.db = connection;
  model.prototype.collection = connection.collection(collectionName);

  // apply methods
  for (var i in schema.methods)
    model.prototype[i] = schema.methods[i];

  // apply statics
  for (var i in schema.statics)
    model[i] = schema.statics[i];

  // apply named scopes
  if (schema.namedScopes) schema.namedScopes.compile(model);

  return model;
};
