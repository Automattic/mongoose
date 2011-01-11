
/**
 * Module dependencies.
 */

var Document = require('./document')
  , MongooseError = require('./error')
  , Query = require('./query');

/**
 * Model constructor
 *
 * @param {Object} values to set
 * @api public
 */

function Model (doc) {
  this.db = this.db || this.base.connection;
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

Model.prototype.collectionName;

/**
 * Model name.
 *
 * @api public
 */

Model.prototype.name;

/**
 * Get the collection
 *
 * @api public
 */

Model.prototype.__defineGetter__('collection', function () {
  if (this._collection)
    return this._collection;
  this._collection = this.db.collection(this.collectionName);
  return this._collection;
});

/**
 * Save the document
 *
 * @param {Function} callback
 */

Model.prototype.save = function (fn) {
  if (this.isNew) {
    this.collection.insert(this.doc, fn);
  } else {
    var doc = {}
      , self = this;

    for (var i in this.dirty){
      if (~i.indexOf('.')){
        (function(i){
          var ref;
          i.split('.').forEach(function(piece, i, arr){
            if (i == arr.length - 1)
              ref[piece] = self.get(i);
            else
              ref = doc[piece] || {};
          });
        })(i);
      } else
        doc[i] = this.get(i);
    }

    this.collection.findAndModify({ _id: this.doc._id }, {}, doc, {}, fn);
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
 * Passes an error to save
 *
 * @api private
 */

Model.prototype.error = function (msg) {
  this.saveError = msg instanceof MongooseError ? msg : new MongooseError(msg);
  return this;
};

/**
 * Register hooks override
 *
 * @api private
 */

Model.prototype.registerHooks = function () {
  Document.protoype.registerHooks.apply(this);
 
  var self = this;

  this.pre('save', function(next) {
    var atomics = self.atomics;
    // handle atomics, last in the chain
    if (atomics.length){
      
    } else {
      next();
    }
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
    return Model.prototype[prop];
  });
});

/**
 * Register hooks for some methods.
 */

Document.registerHooks.call(Model, 'save', 'remove', 'init');

/**
 * Module exports.
 */

module.exports = Model;
