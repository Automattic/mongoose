
/**
 * Module dependencies.
 */

var Document = require('./document')
  , MongooseArray = require('./types/array')
  , DocumentArray = require('./types/documentarray')
  , MongooseError = require('./error')
  , Query = require('./query')
  , utils = require('./utils')
  , EventEmitter = utils.EventEmitter
  , merge = utils.merge
  , Promise = require('./promise');

/**
 * Model constructor
 *
 * @param {Object} values to set
 * @api public
 */

function Model (doc) {
  Document.call(this, doc);
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

Model.prototype.name;

/**
 * Saves the document.
 *
 * @see Model#registerHooks
 * @param {Function} callback
 * @api public
 */

Model.prototype.save = function (fn) {
  var promise = new Promise(fn)
    , options = {}
    , self = this;

  function complete (err) {
    if (err) return promise.error(err);
    promise.complete(self);
    self.emit('save', self);
  };

  // support for safe mode
  if (this.options.safe)
    options.safe = true;

  var dirty = this.activePaths.map('modify', function (path) {
    return { path: path
           , value: self.getValue(path)
           , schema: self.path(path) };
  }); 

  if (this.isNew) {
    // send entire doc
    this.collection.insert(this.toObject(), options, complete);
    this.isNew = false;
    dirty.forEach( function (dirt) {
      var type = dirt.value;
      if (type && type._path && type.doAtomics) {
        type._atomics = {};
      }
    });
  } else {
    // send delta
    var self = this
      , delta
      , useSet = this.options['use$SetOnSave'];

    delta = dirty.reduce( function (delta, data) {
      var type = data.value
        , schema = data.schema
        , atomics, val, obj;

      if (type === null || type === undefined) {
        if (!('$set' in delta))
          delta['$set'] = {};

        delta['$set'][data.path] = type;
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
            if (val.constructor !== Object) {
              if (Array.isArray(val)) val = [val];
              // TODO Should we place pull and push casting into the pull and push methods?
              val = schema.cast(val)[0];
            }
          }
          obj[data.path] = val.toObject
            ? val.toObject() // If the value is an array
            : Array.isArray(val)
              ? val.map( function (mem) { 
                  return mem.toObject
                    ? mem.toObject()
                    : mem.valueOf
                      ? mem.valueOf()
                      : mem;
                })
              : val.valueOf
                ? val.valueOf() // Numbers
                : val;
        }
        type._atomics = {};
      } else {
        // normalize MongooseArray or MongooseNumber
        if (type instanceof MongooseArray) {
          type = type.toObject();
        } else if (type._path)
          type = type.valueOf();

        if (useSet) {
          if (!('$set' in delta))
            delta['$set'] = {};

          delta['$set'][data.path] = type;
        } else
          delta[data.path] = type;
      }

      return delta;
    }, {});

    if (Object.keys(delta).length)
      this.collection.update({ _id: this.doc._id }, delta, options, complete);
    else
      complete(null);

  }
  // Clear 'modify'('dirty') cache
  this.activePaths.clear('modify');
  this.schema.requiredPaths.forEach( function (path) {
    self.activePaths.require(path);
  });
};

/**
 * Remove the document
 *
 * @param {Function} callback
 */

Model.prototype.remove = function (fn) {
  if (this.removing || this.removed)
    return this;

  if (!this.removing) {
    var promise = this.removing = new Promise(fn)
      , self = this;

    this.collection.remove({ _id: this.doc._id }, function (err) {
      if (err) return promise.error(err);
      promise.complete();
      self.emit('remove');
    });
  }

  return this;
};

/**
 * Register hooks override
 *
 * @api private
 */

Model.prototype.registerHooks = function () {
  // make sure to pass along all the errors from subdocuments
  this.pre('save', function (next) {
    // we keep the error semaphore to make sure we don't
    // call `save` unnecessarily (we only need 1 error)
    var subdocs = 0
      , error = false
      , self = this;

    var arrays = this.activePaths
      .map('init', 'modify', function (i) {
        return self.getValue(i);
      })
      .filter(function (val) {
        return (val && val instanceof DocumentArray && val.length);
      });

    if (!arrays.length)
      return next();

    arrays.forEach(function (array) {
      subdocs += array.length;
      array.forEach(function (value) {
        if (!error)
          value.save(function (err) {
            if (!error) {
              if (err) {
                error = true;
                next(err);
              } else
                --subdocs || next();
            }
          });
      });
    });
  });

  Document.prototype.registerHooks.call(this);
};

/**
 * Shortcut to access another model.
 *
 * @param {String} model name
 */

Model.prototype.model = function (name) {
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

Model.init = function () {
  // build indexes
  var self = this
    , indexes = this.schema.indexes
    , count = indexes.length;

  indexes.forEach(function (index) {
    self.collection.ensureIndex(index[0], index[1], function(){
      --count || self.emit('index');
    });
  });
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

['db', 'collection', 'schema', 'options'].forEach(function(prop){
  Model.__defineGetter__(prop, function(){
    return this.prototype[prop];
  });
});

/**
 * Register hooks for some methods.
 */

Document.registerHooks.call(Model, 'save', 'remove', 'init');

/**
 * Module exports.
 */

module.exports = exports = Model;

Model.remove = function (conditions, callback) {
  if ('function' === typeof conditions) {
    callback = conditions;
    conditions = {};
  }
  var query = new Query(conditions).bind(this, 'remove');
  if ('undefined' === typeof callback)
    return query;
  var cQuery;
  if (cQuery = this._cumulativeQuery) {
    merge(query._conditions, cQuery._conditions);
    if (query.options && cQuery.options)
      merge(query.options, cQuery.options);
    delete this._cumulativeQuery;
  }
  if (!query.model) query.bind(this, 'remove');
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

Model.find = function (conditions, fields, options, callback) {
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

  var query = new Query(conditions, options).select(fields).bind(this, 'find');

  if ('undefined' === typeof callback)
    return query;
  
  var cQuery;
  if (cQuery = this._cumulativeQuery) {
    merge(query._conditions, cQuery._conditions);
    if (query._fields && cQuery._fields)
      merge(query._fields, cQuery._fields);
    if (query.options && cQuery.options)
      merge(query.options, cQuery.options);
    delete this._cumulativeQuery;
  }
  if (!query.model)
    query.bind(this, 'find');
  return query.find(callback);
};

/**
 * Finds by id
 *
 * @param {ObjectId/Object} objectid, or a value that can be casted to it
 * @api public
 */

Model.findById = function (id, fields, options, callback) {
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

Model.findOne = function (conditions, fields, options, callback) {
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
  var cQuery;
  if (cQuery = this._cumulativeQuery) {
    merge(query._conditions, cQuery._conditions);
    if (query._fields && cQuery._fields)
      merge(query._fields, cQuery._fields);
    if (query.options && cQuery.options)
      merge(query.options, cQuery.options);
    delete this._cumulativeQuery;
  }
  if (!query.model) query.bind(this, 'findOne');
  return query.findOne(callback);
};

/**
 * Counts documents
 *
 * @param {Object} conditions
 * @param {Function} optional callback
 * @api public
 */

Model.count = function (conditions, callback) {
  var query = new Query(conditions).bind(this, 'count');
  if ('undefined' == typeof callback)
    return query;
  var cQuery;
  if (cQuery = this._cumulativeQuery) {
    merge(query._conditions, cQuery._conditions);
    if (query.options && cQuery.options)
      merge(query.options, cQuery.options);
    delete this._cumulativeQuery;
  }
  if (!query.model) query.bind(this, 'count');
  return query.count(callback);
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

Model.where = function (path, val) {
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

Model.$where = function () {
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

Model.create = function (doc, fn) {
  var args = [].slice.call(arguments)
    , lastArg = args[args.length-1]
    , count, docs = [];
  if (typeof lastArg === 'function') {
    fn = args.pop();
  }
  count = args.length;
  var self = this;
  args.forEach( function (arg, i) {
    var doc = new self(arg);
    docs[i] = doc;
    doc.save(function (err) {
      if (err) return fn(err);
      --count || fn.apply(null, [null].concat(docs));
    });
  });
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
 *  - safe (boolean) safe mode (defaults to value set in schema (false))
 *  - upsert (boolean) whether to create the doc if it doesn't match (false)
 *  - multi (boolean) whether multiple documents should be update (false)
 *
 * @param {Object} conditions
 * @param {Object] doc
 * @param {Object/Function} optional options or callback
 * @param {Function} callback
 * @return {Query}
 * @api public
 */

Model.update = function (conditions, doc, options, callback) {
  if ('function' === typeof doc) {
    // Scenario: update(doc, callback);
    callback = doc;
    doc = conditions;
    conditions = {};
    options = null;
  } else if ('function' === typeof options) {
    callback = options;
    if (!Object.keys(doc).length || this._objectHasPathKeys(doc)) {
      // Scenario: update(conditions, doc, callback)
      options = null;
    } else {
      // Scenario: update(doc, options, callback)
      options = doc;
      doc = conditions;
      conditions = {};
    }
  }
  var query = new Query(conditions, options).bind(this, 'update', doc);
  if ('undefined' == typeof callback)
    return query;
  var cQuery;
  if (cQuery = this._cumulativeQuery) {
    merge(query._conditions, cQuery._conditions);
    if (query.options && cQuery.options)
      merge(query.options, cQuery.options);
    delete this._cumulativeQuery;
  }
  if (!query.model) query.bind(this, 'update');
  return query.update(doc, callback);
};

/**
 * True if the first level of keys contains at least one
 * key that is equal to a path name.
 *
 * @param {Object} object
 * @return {Boolean}
 * @api private
 */

Model._objectHasPathKeys = function (object) {
  var objectKeys = Object.keys(object)
    , anyPaths = Object.keys(this.schema.paths).some( function (path) {
        return ~objectKeys.indexOf(path);
      });
  return anyPaths;
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

Model.compile = function (name, schema, collectionName, connection, base) {
  // generate new class
  function model () {
    Model.apply(this, arguments);
  };

  model.name = name;
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
  if(schema.namedScopes) schema.namedScopes.compile(model);

  return model;
};
