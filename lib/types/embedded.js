/*!
 * Module dependencies.
 */

var Document = require('../document_provider')();
var inspect = require('util').inspect;
var Promise = require('../promise');

/**
 * EmbeddedDocument constructor.
 *
 * @param {Object} obj js object returned from the db
 * @param {MongooseDocumentArray} parentArr the parent array of this document
 * @param {Boolean} skipId
 * @inherits Document
 * @api private
 */

function EmbeddedDocument (obj, parentArr, skipId, fields, index) {
  if (parentArr) {
    this.__parentArray = parentArr;
    this.__parent = parentArr._parent;
  } else {
    this.__parentArray = undefined;
    this.__parent = undefined;
  }
  this.__index = index;

  Document.call(this, obj, fields, skipId);

  var self = this;
  this.on('isNew', function (val) {
    self.isNew = val;
  });
}

/*!
 * Inherit from Document
 */
EmbeddedDocument.prototype = Object.create( Document.prototype );
EmbeddedDocument.prototype.constructor = EmbeddedDocument;

/**
 * Marks the embedded doc modified.
 *
 * ####Example:
 *
 *     var doc = blogpost.comments.id(hexstring);
 *     doc.mixed.type = 'changed';
 *     doc.markModified('mixed.type');
 *
 * @param {String} path the path which changed
 * @api public
 * @receiver EmbeddedDocument
 */

EmbeddedDocument.prototype.markModified = function (path) {
  if (!this.__parentArray) return;

  this.$__.activePaths.modify(path);
  if (this.isNew) {
    // Mark the WHOLE parent array as modified
    // if this is a new document (i.e., we are initializing
    // a document),
    this.__parentArray._markModified();
  } else {
    this.__parentArray._markModified(this, path);
  }
};

/**
 * Used as a stub for [hooks.js](https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3)
 *
 * ####NOTE:
 *
 * _This is a no-op. Does not actually save the doc to the db._
 *
 * @param {Function} [fn]
 * @return {Promise} resolved Promise
 * @api private
 */

EmbeddedDocument.prototype.save = function (fn) {
  var promise = new Promise(fn);
  promise.fulfill();
  return promise;
}

/**
 * Removes the subdocument from its parent array.
 *
 * @param {Function} [fn]
 * @api public
 */

EmbeddedDocument.prototype.remove = function (fn) {
  if (!this.__parentArray) return this;

  var _id;
  if (!this.willRemove) {
    _id = this._doc._id;
    if (!_id) {
      throw new Error('For your own good, Mongoose does not know ' +
                      'how to remove an EmbeddedDocument that has no _id');
    }
    this.__parentArray.pull({ _id: _id });
    this.willRemove = true;
    registerRemoveListener(this);
  }

  if (fn)
    fn(null);

  return this;
};

/*!
 * Registers remove event listeners for triggering
 * on subdocuments.
 *
 * @param {EmbeddedDocument} sub
 * @api private
 */

function registerRemoveListener (sub) {
  var owner = sub.ownerDocument();

  owner.on('save', emitRemove);
  owner.on('remove', emitRemove);

  function emitRemove () {
    owner.removeListener('save', emitRemove);
    owner.removeListener('remove', emitRemove);
    sub.emit('remove', sub);
    owner = sub = emitRemove = null;
  };
};

/**
 * Override #update method of parent documents.
 * @api private
 */

EmbeddedDocument.prototype.update = function () {
  throw new Error('The #update method is not available on EmbeddedDocuments');
}

/**
 * Helper for console.log
 *
 * @api public
 */

EmbeddedDocument.prototype.inspect = function () {
  return inspect(this.toObject());
};

/**
 * Marks a path as invalid, causing validation to fail.
 *
 * @param {String} path the field to invalidate
 * @param {String|Error} err error which states the reason `path` was invalid
 * @return {Boolean}
 * @api public
 */

EmbeddedDocument.prototype.invalidate = function (path, err, val, first) {
  if (!this.__parent) {
    var msg = 'Unable to invalidate a subdocument that has not been added to an array.'
    throw new Error(msg);
  }

  var index = this.__index;
  if (typeof index !== 'undefined') {
    var parentPath = this.__parentArray._path;
    var fullPath = [parentPath, index, path].join('.');
    this.__parent.invalidate(fullPath, err, val);
  }

  if (first) {
    this.$__.validationError = this.ownerDocument().$__.validationError;
  }

  return true;
};

/**
 * Marks a path as valid, removing existing validation errors.
 *
 * @param {String} path the field to mark as valid
 * @api private
 * @method $markValid
 * @receiver EmbeddedDocument
 */

EmbeddedDocument.prototype.$markValid = function(path) {
  if (!this.__parent) {
    return;
  }

  var index = this.__index;
  if (typeof index !== 'undefined') {
    var parentPath = this.__parentArray._path;
    var fullPath = [parentPath, index, path].join('.');
    this.__parent.$markValid(fullPath);
  }
};

/**
 * Checks if a path is invalid
 *
 * @param {String} path the field to check
 * @api private
 * @method $isValid
 * @receiver EmbeddedDocument
 */

EmbeddedDocument.prototype.$isValid = function(path) {
  var index = this.__index;
  if (typeof index !== 'undefined') {
    var parentPath = this.__parentArray._path;
    var fullPath = [parentPath, index, path].join('.');

    return !this.__parent.$__.validationError ||
      !this.__parent.$__.validationError.errors[path];
  }

  return true;
};

/**
 * Returns the top level document of this sub-document.
 *
 * @return {Document}
 */

EmbeddedDocument.prototype.ownerDocument = function () {
  if (this.$__.ownerDocument) {
    return this.$__.ownerDocument;
  }

  var parent = this.__parent;
  if (!parent) return this;

  while (parent.__parent) {
    parent = parent.__parent;
  }

  return this.$__.ownerDocument = parent;
}

/**
 * Returns the full path to this document. If optional `path` is passed, it is appended to the full path.
 *
 * @param {String} [path]
 * @return {String}
 * @api private
 * @method $__fullPath
 * @memberOf EmbeddedDocument
 */

EmbeddedDocument.prototype.$__fullPath = function (path) {
  if (!this.$__.fullPath) {
    var parent = this;
    if (!parent.__parent) return path;

    var paths = [];
    while (parent.__parent) {
      paths.unshift(parent.__parentArray._path);
      parent = parent.__parent;
    }

    this.$__.fullPath = paths.join('.');

    if (!this.$__.ownerDocument) {
      // optimization
      this.$__.ownerDocument = parent;
    }
  }

  return path
    ? this.$__.fullPath + '.' + path
    : this.$__.fullPath;
}

/**
 * Returns this sub-documents parent document.
 *
 * @api public
 */

EmbeddedDocument.prototype.parent = function () {
  return this.__parent;
}

/**
 * Returns this sub-documents parent array.
 *
 * @api public
 */

EmbeddedDocument.prototype.parentArray = function () {
  return this.__parentArray;
}

/*!
 * Module exports.
 */

module.exports = EmbeddedDocument;
