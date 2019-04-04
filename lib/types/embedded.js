/* eslint no-func-assign: 1 */

/*!
 * Module dependencies.
 */

'use strict';

const Document = require('../document_provider')();
const EventEmitter = require('events').EventEmitter;
const immediate = require('../helpers/immediate');
const internalToObjectOptions = require('../options').internalToObjectOptions;
const get = require('../helpers/get');
const utils = require('../utils');
const util = require('util');

const documentArrayParent = require('../helpers/symbols').documentArrayParent;
const validatorErrorSymbol = require('../helpers/symbols').validatorErrorSymbol;

/**
 * EmbeddedDocument constructor.
 *
 * @param {Object} obj js object returned from the db
 * @param {MongooseDocumentArray} parentArr the parent array of this document
 * @param {Boolean} skipId
 * @inherits Document
 * @api private
 */

function EmbeddedDocument(obj, parentArr, skipId, fields, index) {
  if (parentArr) {
    this.__parentArray = parentArr;
    this[documentArrayParent] = parentArr._parent;
  } else {
    this.__parentArray = undefined;
    this[documentArrayParent] = undefined;
  }
  this.$setIndex(index);
  this.$isDocumentArrayElement = true;

  Document.call(this, obj, fields, skipId);

  const _this = this;
  this.on('isNew', function(val) {
    _this.isNew = val;
  });

  _this.on('save', function() {
    _this.constructor.emit('save', _this);
  });
}

/*!
 * Inherit from Document
 */
EmbeddedDocument.prototype = Object.create(Document.prototype);
EmbeddedDocument.prototype.constructor = EmbeddedDocument;

for (const i in EventEmitter.prototype) {
  EmbeddedDocument[i] = EventEmitter.prototype[i];
}

EmbeddedDocument.prototype.toBSON = function() {
  return this.toObject(internalToObjectOptions);
};

/*!
 * ignore
 */

EmbeddedDocument.prototype.$setIndex = function(index) {
  this.__index = index;

  if (get(this, '$__.validationError', null) != null) {
    const keys = Object.keys(this.$__.validationError.errors);
    for (const key of keys) {
      this.invalidate(key, this.$__.validationError.errors[key]);
    }
  }
};

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

EmbeddedDocument.prototype.markModified = function(path) {
  this.$__.activePaths.modify(path);
  if (!this.__parentArray) {
    return;
  }

  if (this.isNew) {
    // Mark the WHOLE parent array as modified
    // if this is a new document (i.e., we are initializing
    // a document),
    this.__parentArray._markModified();
  } else {
    this.__parentArray._markModified(this, path);
  }
};

/*!
 * ignore
 */

EmbeddedDocument.prototype.populate = function() {
  throw new Error('Mongoose does not support calling populate() on nested ' +
    'docs. Instead of `doc.arr[0].populate("path")`, use ' +
    '`doc.populate("arr.0.path")`');
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

EmbeddedDocument.prototype.save = function(options, fn) {
  if (typeof options === 'function') {
    fn = options;
    options = {};
  }
  options = options || {};

  if (!options.suppressWarning) {
    console.warn('mongoose: calling `save()` on a subdoc does **not** save ' +
      'the document to MongoDB, it only runs save middleware. ' +
      'Use `subdoc.save({ suppressWarning: true })` to hide this warning ' +
      'if you\'re sure this behavior is right for your app.');
  }

  return utils.promiseOrCallback(fn, cb => {
    this.$__save(cb);
  });
};

/**
 * Used as a stub for middleware
 *
 * ####NOTE:
 *
 * _This is a no-op. Does not actually save the doc to the db._
 *
 * @param {Function} [fn]
 * @method $__save
 * @api private
 */

EmbeddedDocument.prototype.$__save = function(fn) {
  return immediate(() => fn(null, this));
};

/*!
 * Registers remove event listeners for triggering
 * on subdocuments.
 *
 * @param {EmbeddedDocument} sub
 * @api private
 */

function registerRemoveListener(sub) {
  let owner = sub.ownerDocument();

  function emitRemove() {
    owner.removeListener('save', emitRemove);
    owner.removeListener('remove', emitRemove);
    sub.emit('remove', sub);
    sub.constructor.emit('remove', sub);
    owner = sub = null;
  }

  owner.on('save', emitRemove);
  owner.on('remove', emitRemove);
}

/*!
 * no-op for hooks
 */

EmbeddedDocument.prototype.$__remove = function(cb) {
  return cb(null, this);
};

/**
 * Removes the subdocument from its parent array.
 *
 * @param {Object} [options]
 * @param {Function} [fn]
 * @api public
 */

EmbeddedDocument.prototype.remove = function(options, fn) {
  if ( typeof options === 'function' && !fn ) {
    fn = options;
    options = undefined;
  }
  if (!this.__parentArray || (options && options.noop)) {
    fn && fn(null);
    return this;
  }

  let _id;
  if (!this.willRemove) {
    _id = this._doc._id;
    if (!_id) {
      throw new Error('For your own good, Mongoose does not know ' +
          'how to remove an EmbeddedDocument that has no _id');
    }
    this.__parentArray.pull({_id: _id});
    this.willRemove = true;
    registerRemoveListener(this);
  }

  if (fn) {
    fn(null);
  }

  return this;
};

/**
 * Override #update method of parent documents.
 * @api private
 */

EmbeddedDocument.prototype.update = function() {
  throw new Error('The #update method is not available on EmbeddedDocuments');
};

/**
 * Helper for console.log
 *
 * @api public
 */

EmbeddedDocument.prototype.inspect = function() {
  return this.toObject({
    transform: false,
    virtuals: false,
    flattenDecimals: false
  });
};

if (util.inspect.custom) {
  /*!
  * Avoid Node deprecation warning DEP0079
  */

  EmbeddedDocument.prototype[util.inspect.custom] = EmbeddedDocument.prototype.inspect;
}

/**
 * Marks a path as invalid, causing validation to fail.
 *
 * @param {String} path the field to invalidate
 * @param {String|Error} err error which states the reason `path` was invalid
 * @return {Boolean}
 * @api public
 */

EmbeddedDocument.prototype.invalidate = function(path, err, val) {
  Document.prototype.invalidate.call(this, path, err, val);

  if (!this[documentArrayParent] || this.__index == null) {
    if (err[validatorErrorSymbol] || err.name === 'ValidationError') {
      return true;
    }
    throw err;
  }

  const index = this.__index;
  const parentPath = this.__parentArray._path;
  const fullPath = [parentPath, index, path].join('.');
  this[documentArrayParent].invalidate(fullPath, err, val);

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
  if (!this[documentArrayParent]) {
    return;
  }

  const index = this.__index;
  if (typeof index !== 'undefined') {
    const parentPath = this.__parentArray._path;
    const fullPath = [parentPath, index, path].join('.');
    this[documentArrayParent].$markValid(fullPath);
  }
};

/*!
 * ignore
 */

EmbeddedDocument.prototype.$ignore = function(path) {
  Document.prototype.$ignore.call(this, path);

  if (!this[documentArrayParent]) {
    return;
  }

  const index = this.__index;
  if (typeof index !== 'undefined') {
    const parentPath = this.__parentArray._path;
    const fullPath = [parentPath, index, path].join('.');
    this[documentArrayParent].$ignore(fullPath);
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
  const index = this.__index;
  if (typeof index !== 'undefined' && this[documentArrayParent]) {
    return !this[documentArrayParent].$__.validationError ||
      !this[documentArrayParent].$__.validationError.errors[this.$__fullPath(path)];
  }

  return true;
};

/**
 * Returns the top level document of this sub-document.
 *
 * @return {Document}
 */

EmbeddedDocument.prototype.ownerDocument = function() {
  if (this.$__.ownerDocument) {
    return this.$__.ownerDocument;
  }

  let parent = this[documentArrayParent];
  if (!parent) {
    return this;
  }

  while (parent[documentArrayParent] || parent.$parent) {
    parent = parent[documentArrayParent] || parent.$parent;
  }

  this.$__.ownerDocument = parent;
  return this.$__.ownerDocument;
};

/**
 * Returns the full path to this document. If optional `path` is passed, it is appended to the full path.
 *
 * @param {String} [path]
 * @return {String}
 * @api private
 * @method $__fullPath
 * @memberOf EmbeddedDocument
 * @instance
 */

EmbeddedDocument.prototype.$__fullPath = function(path) {
  if (!this.$__.fullPath) {
    let parent = this; // eslint-disable-line consistent-this
    if (!parent[documentArrayParent]) {
      return path;
    }

    const paths = [];
    while (parent[documentArrayParent] || parent.$parent) {
      if (parent[documentArrayParent]) {
        paths.unshift(parent.__parentArray._path);
      } else {
        paths.unshift(parent.$basePath);
      }
      parent = parent[documentArrayParent] || parent.$parent;
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
};

/**
 * Returns this sub-documents parent document.
 *
 * @api public
 */

EmbeddedDocument.prototype.parent = function() {
  return this[documentArrayParent];
};

/**
 * Returns this sub-documents parent array.
 *
 * @api public
 */

EmbeddedDocument.prototype.parentArray = function() {
  return this.__parentArray;
};

/*!
 * Module exports.
 */

module.exports = EmbeddedDocument;
