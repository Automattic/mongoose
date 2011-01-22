
/**
 * Module dependencies.
 */

var Document = require('./document')
  , DocumentArray = require('./types/documentarray')
  , MongooseError = require('./error')
  , Query = require('./query')
  , EventEmitter = require('./utils').EventEmitter
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
  if (this.isNew) {
    // send entire doc
    this.collection.insert(this.toObject(), fn);
  } else {
    // send delta
    var delta = {}
      , self = this;

    this.activePaths.map('dirty', function (path) {
      var v = self.getValue(path);
    });

    this.collection.findAndModify({ _id: this.doc._id }, {}, delta, {}, fn);
  }
};

/**
 * Remove the document
 *
 * @param {Function} callback
 */

Model.prototype.remove = function (fn) {
  if (this.removing || this.removed) return this;

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
 * Register the atomic operations
 *
 * @param {Array} atomic
 * @api private
 */

Model.prototype.registerAtomic = function (path, op) {
  this.atomics.push([path, op]);
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

    if (!arrays.length) return next();

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
 * Make a query
 *
 * @api public
 */

Model.find = function (query, subset, fn) {
  if (typeof subset == 'function')
    subset = {};
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

['db', 'collection', 'schema'].forEach(function(prop){
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
  for (var i in schema._methods)
    model.prototype[i] = schema._methods[i];

  // apply statics
  for (var i in schema._statics)
    model[i] = schema._statics[i];

  return model;
};
