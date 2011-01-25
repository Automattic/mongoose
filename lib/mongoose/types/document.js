
/**
 * Module dependencies.
 */

var Document = require('../document');

/**
 * EmbeddedDocument constructor.
 *
 * @param {Object} object from db
 * @param {MongooseDocumentArray} parent array
 * @api private
 */

function EmbeddedDocument (obj, parentArr) {
  this.parentArray = parentArr;
  this.parent = parentArr.parent;
  Document.call(this, obj);
};

/**
 * Inherit from Document
 *
 */

EmbeddedDocument.prototype.__proto__ = Document.prototype;

/**
 * Override save to mark the parent as modified
 *
 * @api public
 */

var oldSet = Document.prototype.set;

EmbeddedDocument.prototype.set = function () {
  this.markModified();
  return oldSet.apply(this, arguments);
};

/**
 * Marks parent array as modified
 *
 * @api private
 */

EmbeddedDocument.prototype.markModified = function () {
  this.parentArray._markModified();
};

/**
 * Save the subdocument
 *
 * @api public
 */

EmbeddedDocument.prototype.save = function(fn) {
  if (fn)
    fn(null);
  return this;
};

/**
 * Remove the subdocument
 *
 * @api public
 */

EmbeddedDocument.prototype.remove = function (fn) {
  if (!this.willRemove){
    this.parentArray.$pull({ _id: this.doc._id });
    this.willRemove = true;
  }

  if (fn)
    fn(null);

  return this;
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

/**
 * Module exxports.
 */

module.exports = EmbeddedDocument;
