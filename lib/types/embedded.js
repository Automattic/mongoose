
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
  if (parentArr) {
    this.parentArray = parentArr;
    this.parent = parentArr._parent;
  }

  Document.call(this, obj);

  var self = this;
  this.on('isNew', function (val) {
    self.isNew = val;
  });
};

/**
 * Inherit from Document
 */

EmbeddedDocument.prototype.__proto__ = Document.prototype;

/**
 * Marks parent array as modified
 *
 * @api private
 */

EmbeddedDocument.prototype.commit =
EmbeddedDocument.prototype.markModified = function (path) {
  if (!this.parentArray) return;

  this._activePaths.modify(path);

  if (this.isNew) {
    // Mark the WHOLE parent array as modified
    // if this is a new document (i.e., we are initializing
    // a document),
    this.parentArray._markModified();
  } else
    this.parentArray._markModified(this, path);
};

/**
 * Noop. Does not actually save the doc to the db.
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
  if (!this.parentArray) return this;

  var _id;
  if (!this.willRemove) {
    _id = this._doc._id;
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
 * Invalidate
 *
 * Report accurate embedded paths for invalidation.
 *
 * @param {String} path of the field to invalidate
 * @param {String/Error} error of the path.
 * @api public
 */

EmbeddedDocument.prototype.invalidate = function (path, err) {
  if (!this.parent) return false;
  var index = this.parentArray.indexOf(this);
  var parentPath = this.parentArray._path;
  var fullPath = [parentPath, index, path].join('.');
  this.parent.invalidate(fullPath, err);
  return true;
}

/**
 * Module exports.
 */

module.exports = EmbeddedDocument;
