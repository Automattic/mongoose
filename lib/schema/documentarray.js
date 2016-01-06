/* eslint no-empty: 1 */

/*!
 * Module dependencies.
 */

var ArrayType = require('./array');
var CastError = require('../error/cast');
var MongooseDocumentArray = require('../types/documentarray');
var SchemaType = require('../schematype');
var Subdocument = require('../types/embedded');

/**
 * SubdocsArray SchemaType constructor
 *
 * @param {String} key
 * @param {Schema} schema
 * @param {Object} options
 * @inherits SchemaArray
 * @api public
 */

function DocumentArray(key, schema, options) {
  // compile an embedded document for this schema
  function EmbeddedDocument() {
    Subdocument.apply(this, arguments);
  }

  EmbeddedDocument.prototype = Object.create(Subdocument.prototype);
  EmbeddedDocument.prototype.$__setSchema(schema);
  EmbeddedDocument.schema = schema;

  // apply methods
  for (var i in schema.methods)
    EmbeddedDocument.prototype[i] = schema.methods[i];

  // apply statics
  for (i in schema.statics)
    EmbeddedDocument[i] = schema.statics[i];

  EmbeddedDocument.options = options;

  ArrayType.call(this, key, EmbeddedDocument, options);

  this.schema = schema;
  var path = this.path;
  var fn = this.defaultValue;

  this.default(function() {
    var arr = fn.call(this);
    if (!Array.isArray(arr)) arr = [arr];
    return new MongooseDocumentArray(arr, path, this);
  });
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
DocumentArray.schemaName = 'DocumentArray';

/*!
 * Inherits from ArrayType.
 */
DocumentArray.prototype = Object.create( ArrayType.prototype );
DocumentArray.prototype.constructor = DocumentArray;

/**
 * Performs local validations first, then validations on each embedded doc
 *
 * @api private
 */

DocumentArray.prototype.doValidate = function(array, fn, scope, options) {
  var _this = this;
  SchemaType.prototype.doValidate.call(this, array, function(err) {
    if (err) {
      return fn(err);
    }

    var count = array && array.length;
    var error;

    if (!count) {
      return fn();
    }
    if (options && options.updateValidator) {
      return fn();
    }

    // handle sparse arrays, do not use array.forEach which does not
    // iterate over sparse elements yet reports array.length including
    // them :(

    for (var i = 0, len = count; i < len; ++i) {
      // sidestep sparse entries
      var doc = array[i];
      if (!doc) {
        --count || fn(error);
        continue;
      }

      doc.validate({ __noPromise: true }, function(err) {
        if (err) {
          error = err;
        }
        --count || fn(error);
      });
    }
  }, scope);
};

/**
 * Performs local validations first, then validations on each embedded doc.
 *
 * ####Note:
 *
 * This method ignores the asynchronous validators.
 *
 * @return {MongooseError|undefined}
 * @api private
 */

DocumentArray.prototype.doValidateSync = function(array, scope) {
  var schemaTypeError = SchemaType.prototype.doValidateSync.call(this, array, scope);
  if (schemaTypeError) return schemaTypeError;

  var count = array && array.length,
      resultError = null;

  if (!count) {
    return;
  }

  // handle sparse arrays, do not use array.forEach which does not
  // iterate over sparse elements yet reports array.length including
  // them :(

  for (var i = 0, len = count; i < len; ++i) {
    // only first error
    if ( resultError ) break;
    // sidestep sparse entries
    var doc = array[i];
    if (!doc) continue;

    var subdocValidateError = doc.validateSync();

    if (subdocValidateError) {
      resultError = subdocValidateError;
    }
  }

  return resultError;
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @param {Document} document that triggers the casting
 * @api private
 */

DocumentArray.prototype.cast = function(value, doc, init, prev) {
  var selected,
      subdoc,
      i;

  if (!Array.isArray(value)) {
    // gh-2442 mark whole array as modified if we're initializing a doc from
    // the db and the path isn't an array in the document
    if (!!doc && init) {
      doc.markModified(this.path);
    }
    return this.cast([value], doc, init, prev);
  }

  if (!(value && value.isMongooseDocumentArray)) {
    value = new MongooseDocumentArray(value, this.path, doc);
    if (prev && prev._handlers) {
      for (var key in prev._handlers) {
        doc.removeListener(key, prev._handlers[key]);
      }
    }
  }

  i = value.length;

  while (i--) {
    if (!value[i]) {
      continue;
    }
    // Check if the document has a different schema (re gh-3701)
    if ((value[i] instanceof Subdocument) &&
        value[i].schema !== this.casterConstructor.schema) {
      value[i] = value[i].toObject({ virtuals: false });
    }
    if (!(value[i] instanceof Subdocument) && value[i]) {
      if (init) {
        selected || (selected = scopePaths(this, doc.$__.selected, init));
        subdoc = new this.casterConstructor(null, value, true, selected, i);
        value[i] = subdoc.init(value[i]);
      } else {
        try {
          subdoc = prev.id(value[i]._id);
        } catch (e) {}

        if (prev && subdoc) {
          // handle resetting doc with existing id but differing data
          // doc.array = [{ doc: 'val' }]
          subdoc.set(value[i]);
          // if set() is hooked it will have no return value
          // see gh-746
          value[i] = subdoc;
        } else {
          try {
            subdoc = new this.casterConstructor(value[i], value, undefined,
              undefined, i);
            // if set() is hooked it will have no return value
            // see gh-746
            value[i] = subdoc;
          } catch (error) {
            throw new CastError('embedded', value[i], value._path);
          }
        }
      }
    }
  }

  return value;
};

/*!
 * Scopes paths selected in a query to this array.
 * Necessary for proper default application of subdocument values.
 *
 * @param {DocumentArray} array - the array to scope `fields` paths
 * @param {Object|undefined} fields - the root fields selected in the query
 * @param {Boolean|undefined} init - if we are being created part of a query result
 */

function scopePaths(array, fields, init) {
  if (!(init && fields)) return undefined;

  var path = array.path + '.',
      keys = Object.keys(fields),
      i = keys.length,
      selected = {},
      hasKeys,
      key;

  while (i--) {
    key = keys[i];
    if (0 === key.indexOf(path)) {
      hasKeys || (hasKeys = true);
      selected[key.substring(path.length)] = fields[key];
    }
  }

  return hasKeys && selected || undefined;
}

/*!
 * Module exports.
 */

module.exports = DocumentArray;
