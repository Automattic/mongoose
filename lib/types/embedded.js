/*!
 * Module dependencies.
 */

var Document = require('../document')
  , inspect = require('util').inspect;

/**
 * EmbeddedDocument constructor.
 *
 * @param {Object} obj js object returned from the db
 * @param {MongooseDocumentArray} parentArr the parent array of this document
 * @param {Boolean} skipId
 * @inherits Document
 * @api private
 */

function EmbeddedDocument (obj, parentArr, skipId, fields) {
  if (parentArr) {
    this.__parentArray = parentArr;
    this.__parent = parentArr._parent;
  } else {
    this.__parentArray = undefined;
    this.__parent = undefined;
  }

  Document.call(this, obj, fields, skipId);

  var self = this;
  this.on('isNew', function (val) {
    self.isNew = val;
  });
};

/*!
 * Inherit from Document
 */

EmbeddedDocument.prototype.__proto__ = Document.prototype;

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
 * Supports for individual updates on first level embedded documents, otherwise the following applies:
 *
 * Used as a stub for [hooks.js](https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3)
 *
 * ####NOTE:
 *
 * _This is a no-op. Does not actually save the doc to the db._
 *
 * @param {Function} [fn]
 * @return {EmbeddedDocument} this
 * @api private
 */

EmbeddedDocument.prototype.save = function(fn) {
  // support for individual updates on first level embedded documents
  if (this.__parent && !this.__parent.__parent && !this.__parent.$__.savingEmbeddedDocuments) {
    // bail if new
    if (this.isNew || this.__parent.isNew) {
      var err = new Error('Cannot save a new embedded document, this functionality is intended to work for updates only.');
      if (fn) {
        fn(err);
      } else {
        throw err;
      }
      return this;
    }

    // do nothing in case there are no modifications
    if (!this.isModified()) {
      if (fn)
        fn(null);
      return this;
    }

    // get options from the parent
    var options = {};
    if (this.__parent.schema.options.safe) {
      options.safe = this.__parent.schema.options.safe;
    }

    // build match and update objects to take advantage of the positional operator ($)
    var path = this.$__.fullPath;
    var parentId = this.__parent._id;
    var match = { _id: parentId };
    match[path + '._id'] = this._id;
    var modifiedPaths = this.modifiedPaths();
    var update = { $set: {} };
    for (var i = 0; i < modifiedPaths.length; i++) {
      var currentPath = modifiedPaths[i];
      var schemaType = this.schema.path(currentPath);
      var rawValue = this.getValue(currentPath);
      var value = rawValue;
      if (schemaType) {
        value = schemaType.cast(rawValue);
      }
      update.$set[path + '.$.' + modifiedPaths[i]] = value;
    }

    // remove the modified state of the parent array path from the parent document
    var _this = this;
    this.__parent.$__.activePaths.forEach(function(modifiedPath) {
      if (modifiedPath.indexOf(path) === 0 && modifiedPath !== path) {
        _this.__parent.$__.activePaths.ignore(modifiedPath);
      }
    });

    this.$__reset();
    this.__parent.collection.update(match, update, options, fn);
  } else {
    if (fn)
      fn(null);
  }
  return this;
};

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

  var index = this.__parentArray.indexOf(this);
  var parentPath = this.__parentArray._path;
  var fullPath = [parentPath, index, path].join('.');

  // sniffing arguments:
  // need to check if user passed a value to keep
  // our error message clean.
  if (2 < arguments.length) {
    this.__parent.invalidate(fullPath, err, val);
  } else {
    this.__parent.invalidate(fullPath, err);
  }

  if (first)
    this.$__.validationError = this.ownerDocument().$__.validationError;
  return true;
}

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
