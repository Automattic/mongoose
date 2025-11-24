'use strict';

const Document = require('../document');
const internalToObjectOptions = require('../options').internalToObjectOptions;
const util = require('util');
const utils = require('../utils');

module.exports = Subdocument;

/**
 * Subdocument constructor.
 *
 * @inherits Document
 * @api private
 */

function Subdocument(value, fields, parent, options) {
  if (parent != null) {
    // If setting a nested path, should copy isNew from parent re: gh-7048
    const parentOptions = { isNew: parent.isNew };
    if ('defaults' in parent.$__) {
      parentOptions.defaults = parent.$__.defaults;
    }
    options = Object.assign(parentOptions, options);
  }
  if (options != null && options.path != null) {
    this.$basePath = options.path;
  }
  if (options != null && options.pathRelativeToParent != null) {
    this.$pathRelativeToParent = options.pathRelativeToParent;
  }

  // Don't pass `path` to Document constructor: path is used for storing the
  // absolute path to this schematype relative to the top-level document, but
  // subdocuments use relative paths (relative to the parent document) to track changes.
  // This avoids the subdocument's fields receiving the subdocument's path as options.path.
  let documentOptions = options;
  if (options != null && options.path != null) {
    documentOptions = Object.assign({}, options);
    delete documentOptions.path;
  }

  Document.call(this, value, fields, documentOptions);

  delete this.$__.priorDoc;
}

Subdocument.prototype = Object.create(Document.prototype);

Object.defineProperty(Subdocument.prototype, '$isSubdocument', {
  configurable: false,
  writable: false,
  value: true
});

Object.defineProperty(Subdocument.prototype, '$isSingleNested', {
  configurable: false,
  writable: false,
  value: true
});

/*!
 * ignore
 */

Subdocument.prototype.toBSON = function() {
  return this.toObject(internalToObjectOptions);
};

/**
 * Used as a stub for middleware
 *
 * #### Note:
 *
 * _This is a no-op. Does not actually save the doc to the db._
 *
 * @param {Function} [fn]
 * @return {Promise} resolved Promise
 * @api private
 */

Subdocument.prototype.save = async function save(options) {
  options = options || {};

  if (!options.suppressWarning) {
    utils.warn('mongoose: calling `save()` on a subdoc does **not** save ' +
      'the document to MongoDB, it only runs save middleware. ' +
      'Use `subdoc.save({ suppressWarning: true })` to hide this warning ' +
      'if you\'re sure this behavior is right for your app.');
  }

  return await this.$__save();
};

/**
 * Given a path relative to this document, return the path relative
 * to the top-level document.
 * @param {String} path
 * @method $__fullPath
 * @memberOf Subdocument
 * @instance
 * @returns {String}
 * @api private
 */

Subdocument.prototype.$__fullPath = function(path) {
  if (!this.$__.fullPath) {
    this.ownerDocument();
  }

  return path ?
    this.$__.fullPath + '.' + path :
    this.$__.fullPath;
};

/**
 * Given a path relative to this document, return the path relative
 * to the parent document.
 * @param {String} p
 * @returns {String}
 * @method $__pathRelativeToParent
 * @memberOf Subdocument
 * @instance
 * @api private
 */

Subdocument.prototype.$__pathRelativeToParent = function(p) {
  // If this subdocument has a stored relative path (set by map when subdoc is created),
  // use it directly to avoid string operations
  if (this.$pathRelativeToParent != null) {
    return p == null ? this.$pathRelativeToParent : this.$pathRelativeToParent + '.' + p;
  }

  if (p == null) {
    return this.$basePath;
  }
  if (!this.$basePath) {
    return p;
  }
  return [this.$basePath, p].join('.');
};

/**
 * Used as a stub for middleware
 *
 * #### Note:
 *
 * _This is a no-op. Does not actually save the doc to the db._
 *
 * @param {Function} [fn]
 * @method $__save
 * @api private
 */

Subdocument.prototype.$__save = async function $__save() {
  try {
    await this._execDocumentPreHooks('save');
  } catch (error) {
    await this._execDocumentPostHooks('save', error);
    return;
  }

  await this._execDocumentPostHooks('save');
};

/*!
 * ignore
 */

Subdocument.prototype.$isValid = function(path) {
  const parent = this.$parent();
  const fullPath = this.$__pathRelativeToParent(path);
  if (parent != null && fullPath != null) {
    return parent.$isValid(fullPath);
  }
  return Document.prototype.$isValid.call(this, path);
};

/*!
 * ignore
 */

Subdocument.prototype.markModified = function(path) {
  Document.prototype.markModified.call(this, path);
  const parent = this.$parent();

  if (parent == null) {
    return;
  }

  const pathToMark = this.$__pathRelativeToParent(path);
  if (pathToMark == null) {
    return;
  }

  const myPath = this.$__pathRelativeToParent().replace(/\.$/, '');
  if (parent.isDirectModified(myPath) || this.isNew) {
    return;
  }

  this.$__parent.markModified(pathToMark, this);
};

/*!
 * ignore
 */

Subdocument.prototype.isModified = function(paths, options, modifiedPaths) {
  const parent = this.$parent();
  if (parent != null) {
    if (Array.isArray(paths) || typeof paths === 'string') {
      paths = (Array.isArray(paths) ? paths : paths.split(' '));
      paths = paths.map(p => this.$__pathRelativeToParent(p)).filter(p => p != null);
    } else if (!paths) {
      paths = this.$__pathRelativeToParent();
    }

    return parent.$isModified(paths, options, modifiedPaths);
  }

  return Document.prototype.isModified.call(this, paths, options, modifiedPaths);
};

/**
 * Marks a path as valid, removing existing validation errors.
 *
 * @param {String} path the field to mark as valid
 * @api private
 * @method $markValid
 * @memberOf Subdocument
 */

Subdocument.prototype.$markValid = function(path) {
  Document.prototype.$markValid.call(this, path);
  const parent = this.$parent();
  const fullPath = this.$__pathRelativeToParent(path);
  if (parent != null && fullPath != null) {
    parent.$markValid(fullPath);
  }
};

/*!
 * ignore
 */

Subdocument.prototype.invalidate = function(path, err, val) {
  Document.prototype.invalidate.call(this, path, err, val);

  const parent = this.$parent();
  const fullPath = this.$__pathRelativeToParent(path);
  if (parent != null && fullPath != null) {
    parent.invalidate(fullPath, err, val);
  } else if (err.kind === 'cast' || err.name === 'CastError' || fullPath == null) {
    throw err;
  }

  return this.ownerDocument().$__.validationError;
};

/*!
 * ignore
 */

Subdocument.prototype.$ignore = function(path) {
  Document.prototype.$ignore.call(this, path);
  const parent = this.$parent();
  const fullPath = this.$__pathRelativeToParent(path);
  if (parent != null && fullPath != null) {
    parent.$ignore(fullPath);
  }
};

/**
 * Returns the top level document of this sub-document.
 *
 * @return {Document}
 */

Subdocument.prototype.ownerDocument = function() {
  if (this.$__.ownerDocument) {
    return this.$__.ownerDocument;
  }

  let parent = this;
  const paths = [];
  const seenDocs = new Set([parent]);

  while (true) {
    if (typeof parent.$__pathRelativeToParent !== 'function') {
      break;
    }
    paths.unshift(parent.$__pathRelativeToParent(void 0, true));
    const _parent = parent.$parent();
    if (_parent == null) {
      break;
    }
    parent = _parent;
    if (seenDocs.has(parent)) {
      throw new Error('Infinite subdocument loop: subdoc with _id ' + parent._id + ' is a parent of itself');
    }

    seenDocs.add(parent);
  }

  this.$__.fullPath = paths.join('.');

  this.$__.ownerDocument = parent;
  return this.$__.ownerDocument;
};

/*!
 * ignore
 */

Subdocument.prototype.$__fullPathWithIndexes = function() {
  let parent = this;
  const paths = [];
  const seenDocs = new Set([parent]);

  while (true) {
    if (typeof parent.$__pathRelativeToParent !== 'function') {
      break;
    }
    paths.unshift(parent.$__pathRelativeToParent(void 0, false));
    const _parent = parent.$parent();
    if (_parent == null) {
      break;
    }
    parent = _parent;
    if (seenDocs.has(parent)) {
      throw new Error('Infinite subdocument loop: subdoc with _id ' + parent._id + ' is a parent of itself');
    }

    seenDocs.add(parent);
  }

  return paths.join('.');
};

/**
 * Returns this sub-documents parent document.
 *
 * @api public
 */

Subdocument.prototype.parent = function() {
  return this.$__parent;
};

/**
 * Returns this sub-documents parent document.
 *
 * @api public
 * @method $parent
 */

Subdocument.prototype.$parent = Subdocument.prototype.parent;

/**
 * ignore
 * @method $__removeFromParent
 * @memberOf Subdocument
 * @instance
 * @api private
 */

Subdocument.prototype.$__removeFromParent = function() {
  this.$__parent.set(this.$basePath, null);
};

/**
 * Null-out this subdoc
 *
 * @param {Object} [options]
 */

Subdocument.prototype.deleteOne = function deleteOne(options) {
  registerRemoveListener(this);

  // If removing entire doc, no need to remove subdoc
  if (!options || !options.noop) {
    this.$__removeFromParent();

    const owner = this.ownerDocument();
    owner.$__.removedSubdocs = owner.$__.removedSubdocs || [];
    owner.$__.removedSubdocs.push(this);
  }
};

/*!
 * ignore
 */

Subdocument.prototype.populate = function() {
  throw new Error('Mongoose does not support calling populate() on nested ' +
    'docs. Instead of `doc.nested.populate("path")`, use ' +
    '`doc.populate("nested.path")`');
};

/**
 * Helper for console.log
 *
 * @api public
 */

Subdocument.prototype.inspect = function() {
  return this.toObject();
};

if (util.inspect.custom) {
  // Avoid Node deprecation warning DEP0079
  Subdocument.prototype[util.inspect.custom] = Subdocument.prototype.inspect;
}

/**
 * Override `$toObject()` to handle minimizing the whole path. Should not minimize if schematype-level minimize
 * is set to false re: gh-11247, gh-14058, gh-14151
 */

Subdocument.prototype.$toObject = function $toObject(options, json) {
  const ret = Document.prototype.$toObject.call(this, options, json);

  // If `$toObject()` was called recursively, respect the minimize option, including schematype level minimize.
  // If minimize is set, then we can minimize out the whole object.
  if (Object.keys(ret).length === 0 && options?._calledWithOptions != null) {
    const minimize = options._calledWithOptions?.minimize ?? this?.$__schemaTypeOptions?.minimize ?? options.minimize;
    if (minimize && !this.constructor.$__required) {
      return undefined;
    }
  }
  return ret;
};

/**
 * Registers remove event listeners for triggering
 * on subdocuments.
 *
 * @param {Subdocument} sub
 * @api private
 */

function registerRemoveListener(sub) {
  const owner = sub.ownerDocument();

  function emitRemove() {
    owner.$removeListener('save', emitRemove);
    owner.$removeListener('deleteOne', emitRemove);
    sub.emit('deleteOne', sub);
    sub.constructor.emit('deleteOne', sub);
  }

  owner.$on('save', emitRemove);
  owner.$on('deleteOne', emitRemove);
}
