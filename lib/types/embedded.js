/* eslint no-func-assign: 1 */

/*!
 * Module dependencies.
 */

'use strict';

const EventEmitter = require('events').EventEmitter;
const Subdocument = require('./subdocument');
const get = require('../helpers/get');

const documentArrayParent = require('../helpers/symbols').documentArrayParent;

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
  if (parentArr != null && parentArr.isMongooseDocumentArray) {
    this.__parentArray = parentArr;
    this[documentArrayParent] = parentArr.$parent();
  } else {
    this.__parentArray = undefined;
    this[documentArrayParent] = undefined;
  }
  this.$setIndex(index);
  this.$isDocumentArrayElement = true;
  this.$parent = this[documentArrayParent];

  // Document.call(this, obj, fields, skipId);
  Subdocument.call(this, obj, fields, this[documentArrayParent], void 0, { isNew: true });
  this.$isSingleNested = false;

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
EmbeddedDocument.prototype = Object.create(Subdocument.prototype);
EmbeddedDocument.prototype.constructor = EmbeddedDocument;

for (const i in EventEmitter.prototype) {
  EmbeddedDocument[i] = EventEmitter.prototype[i];
}

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

/*!
 * ignore
 */

EmbeddedDocument.prototype.populate = function() {
  throw new Error('Mongoose does not support calling populate() on nested ' +
    'docs. Instead of `doc.arr[0].populate("path")`, use ' +
    '`doc.populate("arr.0.path")`');
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

/**
 * Removes the subdocument from its parent array.
 *
 * @param {Object} [options]
 * @param {Function} [fn]
 * @api public
 */

EmbeddedDocument.prototype.remove = function(options, fn) {
  if (typeof options === 'function' && !fn) {
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
    this.__parentArray.pull({ _id: _id });
    this.willRemove = true;
    registerRemoveListener(this);
  }

  if (fn) {
    fn(null);
  }

  return this;
};

/**
 * Returns the full path to this document. If optional `path` is passed, it is appended to the full path.
 *
 * @param {String} [path]
 * @param {Boolean} [skipIndex] Skip adding the array index. For example `arr.foo` instead of `arr.0.foo`.
 * @return {String}
 * @api private
 * @method $__fullPath
 * @memberOf EmbeddedDocument
 * @instance
 */

EmbeddedDocument.prototype.$__fullPath = function(path, skipIndex) {
  if (!this.$__.fullPath) {
    let parent = this; // eslint-disable-line consistent-this
    if (!parent[documentArrayParent]) {
      return path;
    }

    const paths = [];
    while (parent[documentArrayParent] || parent.$parent) {
      if (parent[documentArrayParent]) {
        paths.unshift(parent.__parentArray.$path());
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

  if (skipIndex) {
    return path ?
      this.$__.fullPath + '.' + path :
      this.$__.fullPath;
  }

  if (this.__index == null) {
    return null;
  }

  return path ?
    this.$__.fullPath + '.' + this.__index + '.' + path :
    this.$__.fullPath + '.' + this.__index;
};

/*!
 * Given a path relative to this document, return the path relative
 * to the top-level document.
 */

EmbeddedDocument.prototype.$__pathRelativeToParent = function(path) {
  if (this.__index == null) {
    return null;
  }
  if (path == null) {
    return this.__parentArray.$path() + '.' + this.__index;
  }
  return this.__parentArray.$path() + '.' + this.__index + '.' + path;
};

/*!
 * Returns this sub-documents parent document.
 */

EmbeddedDocument.prototype.$__parent = function() {
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
