
/**
 * Module dependencies.
 */

var Document = require('./document')
  , DocumentArray = require('./types/documentarray')
  , MongooseError = require('./error')
  , Query = require('./query');

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
 * Save the document
 *
 * @param {Function} callback
 */

Model.prototype.save = function (fn) {
  if (this.isNew) {
    // send entire doc
    this.collection.insert(this.doc, fn);
  } else {
    // send delta
    var delta = {}
      , self = this;

    for (var i in this.dirty){
      if (~i.indexOf('.')) {
        i.split('.').reduce( function (ref, piece) {
          if (!ref) return delta[piece] || {};
          return ref[piece] = self.get(i);
        }, null);
      } else
        delta[i] = this.get(i);
    }   

    this.collection.findAndModify({ _id: this.doc._id }, {}, delta, {}, fn);
  }
};

/**
 * Remove the document
 *
 * @param {Function} callback
 */

Model.prototype.remove = function (fn) {
  if (!this.willRemove){
    this.collection.remove({ _id: this.doc._id }, fn);
    this.willRemove = true;
  }
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
  this.pre('save', function saveDocumentArrays (next){
    // we keep the error semaphore to make sure we don't
    // call `save` unnecessarily (we only need 1 error)
    var subdocs = 0
      , error = false
      , self = this;

    var arrays = Object.keys(this.initPaths).map( function (i)  {
      return self.getValue(i);
    }).filter( function (val) {
      return (val instanceof DocumentArray && val.length);
    });
    if (!arrays.length) return next();
    arrays.forEach( function (array) {
      subdocs += array.length;
      array.forEach(function(value){
        if (!error)
          value.save(function(err){
            if (!error)
              if (err){
                error = true;
                next(err);
              } else {
                --subdocs || next();
              }
          });
      });
    });
  });

  Document.prototype.registerHooks.call(this);
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
 * @api private
 */

exports.compile = function (name, schema, collectionName, connection) {
  // generate new class
  function model () {
    Model.apply(this, arguments);
  };

  model.name = name;
  model.__proto__ = Model;
  model.prototype.__proto__ = Model.prototype;
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
