'use strict';

const Document = require('../document');
const immediate = require('../helpers/immediate');
const internalToObjectOptions = require('../options').internalToObjectOptions;
const promiseOrCallback = require('../helpers/promiseOrCallback');
const util = require('util');

module.exports = Subdocument;

/**
 * Subdocument constructor.
 *
 * @inherits Document
 * @api private
 */

function Subdocument(value, fields, parent, skipId, options) {
  this.$isSingleNested = true;

  const hasPriorDoc = options != null && options.priorDoc;
  let initedPaths = null;
  if (hasPriorDoc) {
    this._doc = Object.assign({}, options.priorDoc._doc);
    delete this._doc[this.schema.options.discriminatorKey];
    initedPaths = Object.keys(options.priorDoc._doc || {}).
      filter(key => key !== this.schema.options.discriminatorKey);
  }
  if (parent != null) {
    // If setting a nested path, should copy isNew from parent re: gh-7048
    options = Object.assign({}, { isNew: parent.isNew }, options);
  }
  Document.call(this, value, fields, skipId, options);

  if (hasPriorDoc) {
    for (const key of initedPaths) {
      if (!this.$__.activePaths.states.modify[key] &&
          !this.$__.activePaths.states.default[key] &&
          !this.$__.$setCalled.has(key)) {
        const schematype = this.schema.path(key);
        const def = schematype == null ? void 0 : schematype.getDefault(this);
        if (def === void 0) {
          delete this._doc[key];
        } else {
          this._doc[key] = def;
          this.$__.activePaths.default(key);
        }
      }
    }
  }
}

Subdocument.prototype = Object.create(Document.prototype);

/*!
 * ignore
 */

Subdocument.prototype.toBSON = function() {
  return this.toObject(internalToObjectOptions);
};

/**
 * Used as a stub for middleware
 *
 * ####NOTE:
 *
 * _This is a no-op. Does not actually save the doc to the db._
 *
 * @param {Function} [fn]
 * @return {Promise} resolved Promise
 * @api private
 */

Subdocument.prototype.save = function(options, fn) {
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

  return promiseOrCallback(fn, cb => {
    this.$__save(cb);
  });
};

/*!
 * Given a path relative to this document, return the path relative
 * to the top-level document.
 */

Subdocument.prototype.$__fullPath = function(path) {
  if (!this.$__.fullPath) {
    this.ownerDocument();
  }

  return path ?
    this.$__.fullPath + '.' + path :
    this.$__.fullPath;
};

/*!
 * Given a path relative to this document, return the path relative
 * to the top-level document.
 */

Subdocument.prototype.$__pathRelativeToParent = function(p) {
  if (p == null) {
    return this.$basePath;
  }
  return [this.$basePath, p].join('.');
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

Subdocument.prototype.$__save = function(fn) {
  return immediate(() => fn(null, this));
};

/*!
 * ignore
 */

Subdocument.prototype.$isValid = function(path) {
  const parent = this.$__parent();
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
  const parent = this.$__parent();
  const fullPath = this.$__pathRelativeToParent(path);

  if (parent == null || fullPath == null) {
    return;
  }

  const myPath = this.$__pathRelativeToParent().replace(/\.$/, '');
  if (parent.isDirectModified(myPath) || this.isNew) {
    return;
  }
  this.$parent.markModified(fullPath, this);
};

/*!
 * ignore
 */

Subdocument.prototype.isModified = function(paths, modifiedPaths) {
  const parent = this.$__parent();
  if (parent != null) {
    if (Array.isArray(paths) || typeof paths === 'string') {
      paths = (Array.isArray(paths) ? paths : paths.split(' '));
      paths = paths.map(p => this.$__pathRelativeToParent(p)).filter(p => p != null);
    }

    return parent.isModified(paths, modifiedPaths);
  }

  return Document.prototype.isModified.call(this, paths, modifiedPaths);
};

/**
 * Marks a path as valid, removing existing validation errors.
 *
 * @param {String} path the field to mark as valid
 * @api private
 * @method $markValid
 * @receiver Subdocument
 */

Subdocument.prototype.$markValid = function(path) {
  Document.prototype.$markValid.call(this, path);
  const parent = this.$__parent();
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

  const parent = this.$__parent();
  const fullPath = this.$__pathRelativeToParent(path);
  if (parent != null && fullPath != null) {
    parent.invalidate(fullPath, err, val);
  } else if (err.kind === 'cast' || err.name === 'CastError' || fullPath == null) {
    throw err;
  }

  return true;
};

/*!
 * ignore
 */

Subdocument.prototype.$ignore = function(path) {
  Document.prototype.$ignore.call(this, path);
  const parent = this.$__parent();
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

  let parent = this; // eslint-disable-line consistent-this

  const paths = [];

  while (true) {
    if (typeof parent.$__parent !== 'function') {
      break;
    }
    paths.unshift(parent.$__pathRelativeToParent(void 0, true));
    const _parent = parent.$__parent();
    if (_parent == null) {
      break;
    }
    parent = _parent;
  }

  this.$__.fullPath = paths.join('.');

  this.$__.ownerDocument = parent;
  return this.$__.ownerDocument;
};

/**
 * Returns this sub-documents parent document.
 *
 * @api public
 */

Subdocument.prototype.parent = function() {
  return this.$__parent();
};

/*!
 * Returns this sub-documents parent document.
 */

Subdocument.prototype.$__parent = function() {
  return this.$parent;
};

/*!
 * no-op for hooks
 */

Subdocument.prototype.$__remove = function(cb) {
  return cb(null, this);
};

Subdocument.prototype.$__removeFromParent = function() {
  this.$parent.set(this.$basePath, null);
};

/**
 * Null-out this subdoc
 *
 * @param {Object} [options]
 * @param {Function} [callback] optional callback for compatibility with Document.prototype.remove
 */

Subdocument.prototype.remove = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  registerRemoveListener(this);

  // If removing entire doc, no need to remove subdoc
  if (!options || !options.noop) {
    this.$__removeFromParent();
  }

  if (typeof callback === 'function') {
    callback(null);
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

  Subdocument.prototype[util.inspect.custom] = Subdocument.prototype.inspect;
}

/*!
 * Registers remove event listeners for triggering
 * on subdocuments.
 *
 * @param {Subdocument} sub
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
