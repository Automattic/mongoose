'use strict';

/*!
 * Module dependencies.
 */

const ArrayType = require('./array');
const CastError = require('../error/cast');
const EventEmitter = require('events').EventEmitter;
const SchemaDocumentArrayOptions =
  require('../options/SchemaDocumentArrayOptions');
const SchemaType = require('../schematype');
const ValidationError = require('../error/validation');
const discriminator = require('../helpers/model/discriminator');
const get = require('../helpers/get');
const handleIdOption = require('../helpers/schema/handleIdOption');
const util = require('util');
const utils = require('../utils');
const getConstructor = require('../helpers/discriminator/getConstructor');

const arrayParentSymbol = require('../helpers/symbols').arrayParentSymbol;
const arrayPathSymbol = require('../helpers/symbols').arrayPathSymbol;

let MongooseDocumentArray;
let Subdocument;

/**
 * SubdocsArray SchemaType constructor
 *
 * @param {String} key
 * @param {Schema} schema
 * @param {Object} options
 * @inherits SchemaArray
 * @api public
 */

function DocumentArrayPath(key, schema, options, schemaOptions) {
  if (schemaOptions != null && schemaOptions._id != null) {
    schema = handleIdOption(schema, schemaOptions);
  } else if (options != null && options._id != null) {
    schema = handleIdOption(schema, options);
  }

  const EmbeddedDocument = _createConstructor(schema, options);
  EmbeddedDocument.prototype.$basePath = key;

  ArrayType.call(this, key, EmbeddedDocument, options);

  this.schema = schema;
  this.schemaOptions = schemaOptions || {};
  this.$isMongooseDocumentArray = true;
  this.Constructor = EmbeddedDocument;

  EmbeddedDocument.base = schema.base;

  const fn = this.defaultValue;

  if (!('defaultValue' in this) || fn !== void 0) {
    this.default(function() {
      let arr = fn.call(this);
      if (!Array.isArray(arr)) {
        arr = [arr];
      }
      // Leave it up to `cast()` to convert this to a documentarray
      return arr;
    });
  }

  const parentSchemaType = this;
  this.$embeddedSchemaType = new SchemaType(key + '.$', {
    required: get(this, 'schemaOptions.required', false)
  });
  this.$embeddedSchemaType.cast = function(value, doc, init) {
    return parentSchemaType.cast(value, doc, init)[0];
  };
  this.$embeddedSchemaType.$isMongooseDocumentArrayElement = true;
  this.$embeddedSchemaType.caster = this.Constructor;
  this.$embeddedSchemaType.schema = this.schema;
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
DocumentArrayPath.schemaName = 'DocumentArray';

/**
 * Options for all document arrays.
 *
 * - `castNonArrays`: `true` by default. If `false`, Mongoose will throw a CastError when a value isn't an array. If `true`, Mongoose will wrap the provided value in an array before casting.
 *
 * @api public
 */

DocumentArrayPath.options = { castNonArrays: true };

/*!
 * Inherits from ArrayType.
 */
DocumentArrayPath.prototype = Object.create(ArrayType.prototype);
DocumentArrayPath.prototype.constructor = DocumentArrayPath;
DocumentArrayPath.prototype.OptionsConstructor = SchemaDocumentArrayOptions;

/*!
 * Ignore
 */

function _createConstructor(schema, options, baseClass) {
  Subdocument || (Subdocument = require('../types/embedded'));

  // compile an embedded document for this schema
  function EmbeddedDocument() {
    Subdocument.apply(this, arguments);

    this.$session(this.ownerDocument().$session());
  }

  const proto = baseClass != null ? baseClass.prototype : Subdocument.prototype;
  EmbeddedDocument.prototype = Object.create(proto);
  EmbeddedDocument.prototype.$__setSchema(schema);
  EmbeddedDocument.schema = schema;
  EmbeddedDocument.prototype.constructor = EmbeddedDocument;
  EmbeddedDocument.$isArraySubdocument = true;
  EmbeddedDocument.events = new EventEmitter();

  // apply methods
  for (const i in schema.methods) {
    EmbeddedDocument.prototype[i] = schema.methods[i];
  }

  // apply statics
  for (const i in schema.statics) {
    EmbeddedDocument[i] = schema.statics[i];
  }

  for (const i in EventEmitter.prototype) {
    EmbeddedDocument[i] = EventEmitter.prototype[i];
  }

  EmbeddedDocument.options = options;

  return EmbeddedDocument;
}

/**
 * Adds a discriminator to this document array.
 *
 * ####Example:
 *     const shapeSchema = Schema({ name: String }, { discriminatorKey: 'kind' });
 *     const schema = Schema({ shapes: [shapeSchema] });
 *
 *     const docArrayPath = parentSchema.path('shapes');
 *     docArrayPath.discriminator('Circle', Schema({ radius: Number }));
 *
 * @param {String} name
 * @param {Schema} schema fields to add to the schema for instances of this sub-class
 * @param {String} [value] the string stored in the `discriminatorKey` property. If not specified, Mongoose uses the `name` parameter.
 * @see discriminators /docs/discriminators.html
 * @return {Function} the constructor Mongoose will use for creating instances of this discriminator model
 * @api public
 */

DocumentArrayPath.prototype.discriminator = function(name, schema, tiedValue) {
  if (typeof name === 'function') {
    name = utils.getFunctionName(name);
  }

  schema = discriminator(this.casterConstructor, name, schema, tiedValue);

  const EmbeddedDocument = _createConstructor(schema, null, this.casterConstructor);
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

DocumentArrayPath.prototype.doValidate = function(array, fn, scope, options) {
  // lazy load
  MongooseDocumentArray || (MongooseDocumentArray = require('../types/documentarray'));

  const _this = this;
  try {
    SchemaType.prototype.doValidate.call(this, array, cb, scope);
  } catch (err) {
    err.$isArrayValidatorError = true;
    return fn(err);
  }

  function cb(err) {
    if (err) {
      err.$isArrayValidatorError = true;
      return fn(err);
    }

    let count = array && array.length;
    let error;

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
      if (err != null) {
        error = err;
        if (!(error instanceof ValidationError)) {
          error.$isArrayValidatorError = true;
        }
      }
      --count || fn(error);
    }

    for (let i = 0, len = count; i < len; ++i) {
      // sidestep sparse entries
      let doc = array[i];
      if (doc == null) {
        --count || fn(error);
        continue;
      }

      // If you set the array index directly, the doc might not yet be
      // a full fledged mongoose subdoc, so make it into one.
      if (!(doc instanceof Subdocument)) {
        const Constructor = getConstructor(_this.casterConstructor, array[i]);
        doc = array[i] = new Constructor(doc, array, undefined, undefined, i);
      }

      doc.$__validate(callback);
    }
  }
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

DocumentArrayPath.prototype.doValidateSync = function(array, scope) {
  const schemaTypeError = SchemaType.prototype.doValidateSync.call(this, array, scope);
  if (schemaTypeError != null) {
    schemaTypeError.$isArrayValidatorError = true;
    return schemaTypeError;
  }

  const count = array && array.length;
  let resultError = null;

  if (!count) {
    return;
  }

  // handle sparse arrays, do not use array.forEach which does not
  // iterate over sparse elements yet reports array.length including
  // them :(

  for (let i = 0, len = count; i < len; ++i) {
    // sidestep sparse entries
    let doc = array[i];
    if (!doc) {
      continue;
    }

    // If you set the array index directly, the doc might not yet be
    // a full fledged mongoose subdoc, so make it into one.
    if (!(doc instanceof Subdocument)) {
      const Constructor = getConstructor(this.casterConstructor, array[i]);
      doc = array[i] = new Constructor(doc, array, undefined, undefined, i);
    }

    const subdocValidateError = doc.validateSync();

    if (subdocValidateError && resultError == null) {
      resultError = subdocValidateError;
    }
  }

  return resultError;
};

/*!
 * ignore
 */

DocumentArrayPath.prototype.getDefault = function(scope) {
  let ret = typeof this.defaultValue === 'function'
    ? this.defaultValue.call(scope)
    : this.defaultValue;

  if (ret == null) {
    return ret;
  }

  // lazy load
  MongooseDocumentArray || (MongooseDocumentArray = require('../types/documentarray'));

  if (!Array.isArray(ret)) {
    ret = [ret];
  }

  ret = new MongooseDocumentArray(ret, this.path, scope);
  const _parent = ret[arrayParentSymbol];
  ret[arrayParentSymbol] = null;

  for (let i = 0; i < ret.length; ++i) {
    const Constructor = getConstructor(this.casterConstructor, ret[i]);
    ret[i] = new Constructor(ret[i], ret, undefined,
      undefined, i);
  }

  ret[arrayParentSymbol] = _parent;

  return ret;
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @param {Document} document that triggers the casting
 * @api private
 */

DocumentArrayPath.prototype.cast = function(value, doc, init, prev, options) {
  // lazy load
  MongooseDocumentArray || (MongooseDocumentArray = require('../types/documentarray'));

  let selected;
  let subdoc;
  let i;
  const _opts = { transform: false, virtuals: false };

  if (!Array.isArray(value)) {
    if (!init && !DocumentArrayPath.options.castNonArrays) {
      throw new CastError('DocumentArray', util.inspect(value), this.path, null, this);
    }
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

    const Constructor = getConstructor(this.casterConstructor, value[i]);

    // Check if the document has a different schema (re gh-3701)
    if ((value[i].$__) &&
        !(value[i] instanceof Constructor)) {
      value[i] = value[i].toObject({
        transform: false,
        // Special case: if different model, but same schema, apply virtuals
        // re: gh-7898
        virtuals: value[i].schema === Constructor.schema
      });
    }

    if (value[i] instanceof Subdocument) {
      // Might not have the correct index yet, so ensure it does.
      if (value[i].__index == null) {
        value[i].$setIndex(i);
      }
    } else if (value[i] != null) {
      if (init) {
        if (doc) {
          selected || (selected = scopePaths(this, doc.$__.selected, init));
        } else {
          selected = true;
        }

        subdoc = new Constructor(null, value, true, selected, i);
        value[i] = subdoc.init(value[i]);
      } else {
        if (prev && typeof prev.id === 'function') {
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
            const valueInErrorMessage = util.inspect(value[i]);
            throw new CastError('embedded', valueInErrorMessage,
              value[arrayPathSymbol], error, this);
          }
        }
      }
    }
  }

  return value;
};

/*!
 * ignore
 */

DocumentArrayPath.prototype.clone = function() {
  const options = Object.assign({}, this.options);
  const schematype = new this.constructor(this.path, this.schema, options, this.schemaOptions);
  schematype.validators = this.validators.slice();
  schematype.Constructor.discriminators = Object.assign({},
    this.Constructor.discriminators);
  return schematype;
};

/*!
 * Scopes paths selected in a query to this array.
 * Necessary for proper default application of subdocument values.
 *
 * @param {DocumentArrayPath} array - the array to scope `fields` paths
 * @param {Object|undefined} fields - the root fields selected in the query
 * @param {Boolean|undefined} init - if we are being created part of a query result
 */

function scopePaths(array, fields, init) {
  if (!(init && fields)) {
    return undefined;
  }

  const path = array.path + '.';
  const keys = Object.keys(fields);
  let i = keys.length;
  const selected = {};
  let hasKeys;
  let key;
  let sub;

  while (i--) {
    key = keys[i];
    if (key.startsWith(path)) {
      sub = key.substring(path.length);
      if (sub === '$') {
        continue;
      }
      if (sub.startsWith('$.')) {
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

module.exports = DocumentArrayPath;
