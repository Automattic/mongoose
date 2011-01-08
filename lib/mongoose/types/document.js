
/**
 * Module dependencies.
 */

var Document = require('../document');

/**
 * EmbeddedDocument constructor.
 *
 * @param {Object} object from db
 * @param {String} key path
 * @param {Document} parent document (parent of parent array
 * @param {EmbeddedArray} parent array
 * @api private
 */

function EmbeddedDocument (obj, path, doc, parentArray) {
  this.path = path;
  this.parentArray = parentArray;
  this.parent = doc;
  Document.call(this, obj);
  
  // Make post()s work here
  var self = this;

  this.parentModel.on('save', function(){
    if (parentArray.path in self.parentModel.dirtyPaths)
      self.emit('save');
  });
  this.parentModel.on('remove', function(){
    self.emit('remove');
  });

  // Modifying a subdocument marks the parent array as dirty
  this.on('dirty', function(key){
    parentArray.commit();
  });
};

/**
 * Inherit from Document
 *
 */

EmbeddedDocument.prototype.__proto__ = Document.prototype;

/**
 * Save the subdocument
 *
 * @api public
 */

EmbeddedDocument.prototype.save = function(fn) {
  // Figure out at some point how to make atomic saves of subdocs
  return false;
};

/**
 * Remove the subdocument
 *
 * @api public
 */

EmbeddedDocument.prototype.remove = function () {
  if (!this.willRemove){
    this.parentArray.$pull({ _id: this.doc._id });
    this.willRemove = true;
  }
};

/**
 * Bubbles the error up
 *
 * @api private
 */

EmbeddedDocument.prototype.error = function (msg) {
  return this.parent.error(msg);
};

/**
 * Validate the doc
 *
 * @param {Function} next
 * @api private
 */

EmbeddedDocument.prototype.validate = function (next) {
  if (this.willRemove) return next();
  return Document.prototype.validate.call(this, next);
};

/**
 * Apply defaults
 *
 * @param {Function} next
 * @api private
 */

EmbeddedDocument.prototype.applyDefaults = function (next) {
  if (this.willRemove) return next();
  return Document.prototype.validate.call(this, next);
};


/**
 * Delegates the atomic registration to the parent doc
 *
 * @param {Array} atomic operation
 * @api private
 */

EmbeddedDocument.prototype.registerAtomic = function (atomic) {
  this.error('Unsupported');
};

/**
 * Register hooks for some methods
 */

Document.registerHooks.call(EmbeddedDocument, 'save', 'remove', 'init');
