
/**
 * Module dependencies.
 */

var Document = require('../document')
  , inspect = require('util').inspect;

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
 * Override set to mark the parent as modified
 *
 * @api public
 */

var oldSet = Document.prototype.set;

EmbeddedDocument.prototype.set = function (path) {
  this.markModified(path);
  return oldSet.apply(this, arguments);
};

/**
 * Marks parent array as modified
 *
 * @api private
 */

EmbeddedDocument.prototype.commit =
EmbeddedDocument.prototype.markModified = function (path) {
  this.activePaths.modify(path);

  if (this.isNew) {
    // Mark the WHOLE parent array as modified
    // if this is a new document (i.e., we are initializing
    // a document),
    this.parentArray._markModified();
  } else
    this.parentArray._markModified(this, path);
};

/**
 * Save the subdocument
 *
 * @api public
 */

EmbeddedDocument.prototype.save = function(fn) {
  if (fn)
    fn(null);
  this.emit('save', this);
  return this;
};

/**
 * Remove the subdocument
 *
 * @api public
 */

EmbeddedDocument.prototype.remove = function (fn) {
  var _id;
  if (!this.willRemove){
    _id = this.doc._id;
    if (!_id) {
      throw new Error('For your own good, Mongoose does not know ' + 
                      'how to remove an EmbeddedDocument that has no _id');
    }
    this.parentArray.$pull({ _id: _id });
    this.willRemove = true;
  }

  if (fn)
    fn(null);

  return this;
};

/**
 * Helper for console.log
 *
 * @api public
 */

EmbeddedDocument.prototype.inspect = function () {
  return inspect(this.toObject());
};

/**
 * Module exxports.
 */

module.exports = EmbeddedDocument;
