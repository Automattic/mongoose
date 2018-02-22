/* eslint no-empty: 1 */

/*!
 * Module dependencies.
 */

var ArrayType = require('./array');
var CastError = require('../error/cast');
var Document = require('../document');
var EventEmitter = require('events').EventEmitter;
var SchemaType = require('../schematype');
var discriminator = require('../services/model/discriminator');
var util = require('util');
var utils = require('../utils');

var MongooseDocumentArray;
var Subdocument;

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
  var EmbeddedDocument = _createConstructor(schema, options);
  EmbeddedDocument.prototype.$basePath = key;

  ArrayType.call(this, key, EmbeddedDocument, options);

  this.schema = schema;
  this.$isMongooseDocumentArray = true;
  var fn = this.defaultValue;

  if (!('defaultValue' in this) || fn !== void 0) {
    this.default(function() {
      var arr = fn.call(this);
      if (!Array.isArray(arr)) {
        arr = [arr];
      }
      // Leave it up to `cast()` to convert this to a documentarray
      return arr;
    });
  }
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
DocumentArray.prototype = Object.create(ArrayType.prototype);
DocumentArray.prototype.constructor = DocumentArray;

/*!
 * Ignore
 */

function _createConstructor(schema, options) {
  Subdocument || (Subdocument = require('../types/embedded'));

  // compile an embedded document for this schema
  function EmbeddedDocument() {
    Subdocument.apply(this, arguments);
  }

  EmbeddedDocument.prototype = Object.create(Subdocument.prototype);
  EmbeddedDocument.prototype.$__setSchema(schema);
  EmbeddedDocument.schema = schema;
  EmbeddedDocument.prototype.constructor = EmbeddedDocument;
  EmbeddedDocument.$isArraySubdocument = true;

  // apply methods
  for (var i in schema.methods) {
    EmbeddedDocument.prototype[i] = schema.methods[i];
  }

  // apply statics
  for (i in schema.statics) {
    EmbeddedDocument[i] = schema.statics[i];
  }

  for (i in EventEmitter.prototype) {
    EmbeddedDocument[i] = EventEmitter.prototype[i];
  }

  EmbeddedDocument.options = options;

  return EmbeddedDocument;
}

/*!
 * Ignore
 */

DocumentArray.prototype.discriminator = function(name, schema) {
  if (typeof name === 'function') {
    name = utils.getFunctionName(name);
  }

  schema = discriminator(this.casterConstructor, name, schema);

  var EmbeddedDocument = _createConstructor(schema);
  EmbeddedDocument.baseCasterConstructor = this.casterConstructor;

  try {
    Object.defineProperty(EmbeddedDocument, 'name', {
      value: name
    });
  } catch (error) {
    // Ignore error, only happens on old versions of node
  }

  this.casterConstructor.discriminators[name] = EmbeddedDocument;

  return this.casterConstructor.discriminators[name];
};

/**
 * Performs local validations first, then validations on each embedded doc
 *
 * @api private
 */

DocumentArray.prototype.doValidate = function(array, fn, scope, options) {
  // lazy load
  MongooseDocumentArray || (MongooseDocumentArray = require('../types/documentarray'));

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
    if (!array.isMongooseDocumentArray) {
      array = new MongooseDocumentArray(array, _this.path, scope);
    }

    // handle sparse arrays, do not use array.forEach which does not
    // iterate over sparse elements yet reports array.length including
    // them :(

    function callback(err) {
      if (err) {
        error = err;
      }
      --count || fn(error);
    }

    for (var i = 0, len = count; i < len; ++i) {
      // sidestep sparse entries
      var doc = array[i];
      if (!doc) {
        --count || fn(error);
        continue;
      }

      // If you set the array index directly, the doc might not yet be
      // a full fledged mongoose subdoc, so make it into one.
      if (!(doc instanceof Subdocument)) {
        doc = array[i] = new _this.casterConstructor(doc, array, undefined,
          undefined, i);
      }

      doc.$__validate(callback);
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
  if (schemaTypeError) {
    return schemaTypeError;
  }

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
    if (resultError) {
      break;
    }
    // sidestep sparse entries
    var doc = array[i];
    if (!doc) {
      continue;
    }

    // If you set the array index directly, the doc might not yet be
    // a full fledged mongoose subdoc, so make it into one.
    if (!(doc instanceof Subdocument)) {
      doc = array[i] = new this.casterConstructor(doc, array, undefined,
        undefined, i);
    }

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

DocumentArray.prototype.cast = function(value, doc, init, prev, options) {
  // lazy load
  MongooseDocumentArray || (MongooseDocumentArray = require('../types/documentarray'));

  var selected;
  var subdoc;
  var i;
  var _opts = { transform: false, virtuals: false };

  if (!Array.isArray(value)) {
    // gh-2442 mark whole array as modified if we're initializing a doc from
    // the db and the path isn't an array in the document
    if (!!doc && init) {
      doc.markModified(this.path);
    }
    return this.cast([value], doc, init, prev);
  }

  if (!(value && value.isMongooseDocumentArray) &&
      (!options || !options.skipDocumentArrayCast)) {
    value = new MongooseDocumentArray(value, this.path, doc);
    if (prev && prev._handlers) {
      for (var key in prev._handlers) {
        doc.removeListener(key, prev._handlers[key]);
      }
    }
  } else if (value && value.isMongooseDocumentArray) {
    // We need to create a new array, otherwise change tracking will
    // update the old doc (gh-4449)
    value = new MongooseDocumentArray(value, this.path, doc);
  }

  i = value.length;

  while (i--) {
    if (!value[i]) {
      continue;
    }

    var Constructor = this.casterConstructor;
    if (Constructor.discriminators &&
        typeof value[i][Constructor.schema.options.discriminatorKey] === 'string' &&
        Constructor.discriminators[value[i][Constructor.schema.options.discriminatorKey]]) {
      Constructor = Constructor.discriminators[value[i][Constructor.schema.options.discriminatorKey]];
    }

    // Check if the document has a different schema (re gh-3701)
    if ((value[i] instanceof Document) &&
        value[i].schema !== Constructor.schema) {
      value[i] = value[i].toObject({ transform: false, virtuals: false });
    }
    if (!(value[i] instanceof Subdocument) && value[i]) {
      if (init) {
        if (doc) {
          selected || (selected = scopePaths(this, doc.$__.selected, init));
        } else {
          selected = true;
        }

        subdoc = new Constructor(null, value, true, selected, i);
        value[i] = subdoc.init(value[i]);
      } else {
        if (prev && (subdoc = prev.id(value[i]._id))) {
          subdoc = prev.id(value[i]._id);
        }

        if (prev && subdoc && utils.deepEqual(subdoc.toObject(_opts), value[i])) {
          // handle resetting doc with existing id and same data
          subdoc.set(value[i]);
          // if set() is hooked it will have no return value
          // see gh-746
          value[i] = subdoc;
        } else {
          try {
            subdoc = new Constructor(value[i], value, undefined,
              undefined, i);
            // if set() is hooked it will have no return value
            // see gh-746
            value[i] = subdoc;
          } catch (error) {
            var valueInErrorMessage = util.inspect(value[i]);
            throw new CastError('embedded', valueInErrorMessage,
              value._path, error);
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
  if (!(init && fields)) {
    return undefined;
  }

  var path = array.path + '.';
  var keys = Object.keys(fields);
  var i = keys.length;
  var selected = {};
  var hasKeys;
  var key;
  var sub;

  while (i--) {
    key = keys[i];
    if (key.indexOf(path) === 0) {
      sub = key.substring(path.length);
      if (sub === '$') {
        continue;
      }
      if (sub.indexOf('$.') === 0) {
        sub = sub.substr(2);
      }
      hasKeys || (hasKeys = true);
      selected[sub] = fields[key];
    }
  }

  return hasKeys && selected || undefined;
}

/*!
 * Module exports.
 */

module.exports = DocumentArray;
