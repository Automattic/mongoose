var Document = require('../document');
var PromiseProvider = require('../promise_provider');

module.exports = Subdocument;

/**
 * Subdocument constructor.
 *
 * @inherits Document
 * @api private
 */

function Subdocument(value, fields) {
  this.$isSingleNested = true;
  Document.call(this, value, fields);
}

Subdocument.prototype = Object.create(Document.prototype);

Subdocument.prototype.toBSON = function() {
  return this.toObject({
    transform: false,
    virtuals: false,
    _skipDepopulateTopLevel: true,
    depopulate: true,
    flattenDecimals: false
  });
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

Subdocument.prototype.save = function(fn) {
  var Promise = PromiseProvider.get();
  return new Promise.ES6(function(resolve) {
    fn && fn();
    resolve();
  });
};

Subdocument.prototype.$isValid = function(path) {
  if (this.$parent) {
    return this.$parent.$isValid([this.$basePath, path].join('.'));
  }
  return Document.prototype.$isValid.call(this, path);
};

Subdocument.prototype.markModified = function(path) {
  Document.prototype.markModified.call(this, path);
  if (this.$parent) {
    if (this.$parent.isDirectModified(this.$basePath)) {
      return;
    }
    this.$parent.markModified([this.$basePath, path].join('.'));
  }
};

Subdocument.prototype.$markValid = function(path) {
  Document.prototype.$markValid.call(this, path);
  if (this.$parent) {
    this.$parent.$markValid([this.$basePath, path].join('.'));
  }
};

Subdocument.prototype.invalidate = function(path, err, val) {
  // Hack: array subdocuments' validationError is equal to the owner doc's,
  // so validating an array subdoc gives the top-level doc back. Temporary
  // workaround for #5208 so we don't have circular errors.
  if (err !== this.ownerDocument().$__.validationError) {
    Document.prototype.invalidate.call(this, path, err, val);
  }

  if (this.$parent) {
    this.$parent.invalidate([this.$basePath, path].join('.'), err, val);
  } else if (err.kind === 'cast' || err.name === 'CastError') {
    throw err;
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

  var parent = this.$parent;
  if (!parent) {
    return this;
  }

  while (parent.$parent || parent.__parent) {
    parent = parent.$parent || parent.__parent;
  }
  this.$__.ownerDocument = parent;
  return this.$__.ownerDocument;
};

/**
 * Returns this sub-documents parent document.
 *
 * @api public
 */

Subdocument.prototype.parent = function() {
  return this.$parent;
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
    this.$parent.set(this.$basePath, null);
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

/*!
 * Registers remove event listeners for triggering
 * on subdocuments.
 *
 * @param {EmbeddedDocument} sub
 * @api private
 */

function registerRemoveListener(sub) {
  var owner = sub.ownerDocument();

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
