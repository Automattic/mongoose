'use strict';

/*!
 * Module dependencies.
 */

const CastError = require('../error/cast');
const DocumentArrayElement = require('./documentArrayElement');
const EventEmitter = require('events').EventEmitter;
const SchemaArray = require('./array');
const SchemaDocumentArrayOptions =
  require('../options/schemaDocumentArrayOptions');
const SchemaType = require('../schemaType');
const cast = require('../cast');
const createJSONSchemaTypeDefinition = require('../helpers/createJSONSchemaTypeDefinition');
const discriminator = require('../helpers/model/discriminator');
const handleIdOption = require('../helpers/schema/handleIdOption');
const handleSpreadDoc = require('../helpers/document/handleSpreadDoc');
const isOperator = require('../helpers/query/isOperator');
const utils = require('../utils');
const getConstructor = require('../helpers/discriminator/getConstructor');
const InvalidSchemaOptionError = require('../error/invalidSchemaOption');

const arrayAtomicsSymbol = require('../helpers/symbols').arrayAtomicsSymbol;
const arrayPathSymbol = require('../helpers/symbols').arrayPathSymbol;
const documentArrayParent = require('../helpers/symbols').documentArrayParent;

let MongooseDocumentArray;
let Subdocument;

/**
 * SubdocsArray SchemaType constructor
 *
 * @param {String} key
 * @param {Schema} schema
 * @param {Object} options
 * @param {Object} schemaOptions
 * @param {Schema} parentSchema
 * @inherits SchemaArray
 * @api public
 */

function SchemaDocumentArray(key, schema, options, schemaOptions, parentSchema) {
  if (schema.options?.timeseries) {
    throw new InvalidSchemaOptionError(key, 'timeseries');
  }
  const schemaTypeIdOption = SchemaDocumentArray.defaultOptions?._id;
  if (schemaTypeIdOption != null) {
    schemaOptions = schemaOptions || {};
    schemaOptions._id = schemaTypeIdOption;
  }

  if (schemaOptions?._id != null) {
    schema = handleIdOption(schema, schemaOptions);
  } else if (options?._id != null) {
    schema = handleIdOption(schema, options);
  }

  const Constructor = _createConstructor(schema, options);
  Constructor.prototype.$basePath = key;
  Constructor.path = key;

  const $parentSchemaType = this;
  const embeddedSchemaType = new DocumentArrayElement(key + '.$', schema, {
    ...(schemaOptions || {}),
    $parentSchemaType,
    Constructor
  });

  SchemaArray.call(this, key, embeddedSchemaType, options, null, parentSchema);

  this.schema = schema;
  // EmbeddedDocument schematype options
  this.schemaOptions = schemaOptions || {};
  this.$isMongooseDocumentArray = true;
  this.Constructor = Constructor;

  Constructor.base = schema.base;

  const fn = this.defaultValue;

  if (!('defaultValue' in this) || fn != null) {
    this.default(function() {
      let arr = fn.call(this);
      if (arr != null && !Array.isArray(arr)) {
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
SchemaDocumentArray.schemaName = 'DocumentArray';

/**
 * Options for all document arrays.
 *
 * - `castNonArrays`: `true` by default. If `false`, Mongoose will throw a CastError when a value isn't an array. If `true`, Mongoose will wrap the provided value in an array before casting.
 *
 * @api public
 */

SchemaDocumentArray.options = { castNonArrays: true };

/*!
 * Inherits from SchemaArray.
 */
SchemaDocumentArray.prototype = Object.create(SchemaArray.prototype);
SchemaDocumentArray.prototype.constructor = SchemaDocumentArray;
SchemaDocumentArray.prototype.OptionsConstructor = SchemaDocumentArrayOptions;

/**
 * Contains the handlers for different query operators for this schema type.
 * For example, `$conditionalHandlers.$size` is the function Mongoose calls to cast `$size` filter operators.
 *
 * @property $conditionalHandlers
 * @memberOf SchemaDocumentArray
 * @instance
 * @api public
 */

Object.defineProperty(SchemaDocumentArray.prototype, '$conditionalHandlers', {
  enumerable: false,
  value: { ...SchemaArray.prototype.$conditionalHandlers }
});

/*!
 * ignore
 */

function _createConstructor(schema, options, baseClass) {
  Subdocument || (Subdocument = require('../types/arraySubdocument'));

  // compile an embedded document for this schema
  function EmbeddedDocument() {
    Subdocument.apply(this, arguments);
    if (this.__parentArray == null || this.__parentArray.getArrayParent() == null) {
      return;
    }
    this.$session(this.__parentArray.getArrayParent().$session());
  }

  schema._preCompile();

  const proto = baseClass?.prototype ?? Subdocument.prototype;
  EmbeddedDocument.prototype = Object.create(proto);
  EmbeddedDocument.prototype.$__setSchema(schema);
  EmbeddedDocument.schema = schema;
  EmbeddedDocument.prototype.constructor = EmbeddedDocument;
  EmbeddedDocument.$isArraySubdocument = true;
  EmbeddedDocument.events = new EventEmitter();
  EmbeddedDocument.base = schema.base;

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
 * #### Example:
 *
 *     const shapeSchema = Schema({ name: String }, { discriminatorKey: 'kind' });
 *     const schema = Schema({ shapes: [shapeSchema] });
 *
 *     const docArrayPath = parentSchema.path('shapes');
 *     docArrayPath.discriminator('Circle', Schema({ radius: Number }));
 *
 * @param {String} name
 * @param {Schema} schema fields to add to the schema for instances of this sub-class
 * @param {Object|string} [options] If string, same as `options.value`.
 * @param {String} [options.value] the string stored in the `discriminatorKey` property. If not specified, Mongoose uses the `name` parameter.
 * @param {Boolean} [options.clone=true] By default, `discriminator()` clones the given `schema`. Set to `false` to skip cloning.
 * @see discriminators https://mongoosejs.com/docs/discriminators.html
 * @return {Function} the constructor Mongoose will use for creating instances of this discriminator model
 * @api public
 */

SchemaDocumentArray.prototype.discriminator = function(name, schema, options) {
  if (typeof name === 'function') {
    name = utils.getFunctionName(name);
  }

  options = options || {};
  const tiedValue = utils.isPOJO(options) ? options.value : options;
  const clone = typeof options.clone === 'boolean' ? options.clone : true;

  if (schema.instanceOfSchema && clone) {
    schema = schema.clone();
  }

  schema = discriminator(this.Constructor, name, schema, tiedValue, null, null, options?.overwriteExisting);

  const EmbeddedDocument = _createConstructor(schema, null, this.Constructor);
  EmbeddedDocument.baseCasterConstructor = this.Constructor;

  Object.defineProperty(EmbeddedDocument, 'name', {
    value: name
  });

  this.Constructor.discriminators[name] = EmbeddedDocument;

  return this.Constructor.discriminators[name];
};

/**
 * Performs local validations first, then validations on each embedded doc
 *
 * @api public
 */

SchemaDocumentArray.prototype.doValidate = async function doValidate(array, scope, options) {
  // lazy load
  MongooseDocumentArray || (MongooseDocumentArray = require('../types/documentArray'));

  await SchemaType.prototype.doValidate.call(this, array, scope);
  if (options?.updateValidator) {
    return;
  }
  if (!utils.isMongooseDocumentArray(array)) {
    array = new MongooseDocumentArray(array, this.path, scope);
  }

  const promises = [];
  for (let i = 0; i < array.length; ++i) {
    // handle sparse arrays, do not use array.forEach which does not
    // iterate over sparse elements yet reports array.length including
    // them :(
    let doc = array[i];
    if (doc == null) {
      continue;
    }
    // If you set the array index directly, the doc might not yet be
    // a full fledged mongoose subdoc, so make it into one.
    if (!(doc instanceof Subdocument)) {
      const Constructor = getConstructor(this.Constructor, array[i]);
      doc = array[i] = new Constructor(doc, array, undefined, undefined, i);
    }

    if (options?.validateModifiedOnly && !doc.$isModified()) {
      continue;
    }

    promises.push(doc.$__validate(null, options));
  }

  await Promise.all(promises);
};

/**
 * Performs local validations first, then validations on each embedded doc.
 *
 * #### Note:
 *
 * This method ignores the asynchronous validators.
 *
 * @return {MongooseError|undefined}
 * @api private
 */

SchemaDocumentArray.prototype.doValidateSync = function(array, scope, options) {
  const schemaTypeError = SchemaType.prototype.doValidateSync.call(this, array, scope);
  if (schemaTypeError != null) {
    return schemaTypeError;
  }

  const count = array?.length;
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
      const Constructor = getConstructor(this.Constructor, array[i]);
      doc = array[i] = new Constructor(doc, array, undefined, undefined, i);
    }

    if (options?.validateModifiedOnly && !doc.$isModified()) {
      continue;
    }

    const subdocValidateError = doc.validateSync(options);

    if (subdocValidateError && resultError == null) {
      resultError = subdocValidateError;
    }
  }

  return resultError;
};

/*!
 * ignore
 */

SchemaDocumentArray.prototype.getDefault = function(scope, init, options) {
  let ret = typeof this.defaultValue === 'function'
    ? this.defaultValue.call(scope)
    : this.defaultValue;

  if (ret == null) {
    return ret;
  }

  if (options?.skipCast) {
    return ret;
  }

  // lazy load
  MongooseDocumentArray || (MongooseDocumentArray = require('../types/documentArray'));

  if (!Array.isArray(ret)) {
    ret = [ret];
  }

  ret = new MongooseDocumentArray(ret, this.path, scope);

  for (let i = 0; i < ret.length; ++i) {
    const Constructor = getConstructor(this.Constructor, ret[i]);
    const _subdoc = new Constructor({}, ret, undefined,
      undefined, i);
    _subdoc.$init(ret[i]);
    _subdoc.isNew = true;

    // Make sure all paths in the subdoc are set to `default` instead
    // of `init` since we used `init`.
    Object.assign(_subdoc.$__.activePaths.default, _subdoc.$__.activePaths.init);
    _subdoc.$__.activePaths.init = {};

    ret[i] = _subdoc;
  }

  return ret;
};

const _toObjectOptions = Object.freeze({ transform: false, virtuals: false });
const initDocumentOptions = Object.freeze({ skipId: false, willInit: true });

/**
 * Casts contents
 *
 * @param {Object} value
 * @param {Document} document that triggers the casting
 * @api private
 */

SchemaDocumentArray.prototype.cast = function(value, doc, init, prev, options) {
  // lazy load
  MongooseDocumentArray || (MongooseDocumentArray = require('../types/documentArray'));

  // Skip casting if `value` is the same as the previous value, no need to cast. See gh-9266
  if (value?.[arrayPathSymbol] != null && value === prev) {
    return value;
  }

  let selected;
  let subdoc;

  options = options || {};

  const path = options.path || this.path;

  if (!Array.isArray(value)) {
    if (!init && !SchemaDocumentArray.options.castNonArrays) {
      throw new CastError('DocumentArray', value, this.path, null, this);
    }
    // gh-2442 mark whole array as modified if we're initializing a doc from
    // the db and the path isn't an array in the document
    if (!!doc && init) {
      doc.markModified(path);
    }
    return this.cast([value], doc, init, prev, options);
  }

  // We need to create a new array, otherwise change tracking will
  // update the old doc (gh-4449)
  if (!options.skipDocumentArrayCast || utils.isMongooseDocumentArray(value)) {
    value = new MongooseDocumentArray(value, path, doc, this);
  }

  if (prev != null) {
    value[arrayAtomicsSymbol] = prev[arrayAtomicsSymbol] || {};
  }

  if (options.arrayPathIndex != null) {
    value[arrayPathSymbol] = path + '.' + options.arrayPathIndex;
  }

  const rawArray = utils.isMongooseDocumentArray(value) ? value.__array : value;
  const len = rawArray.length;

  for (let i = 0; i < len; ++i) {
    if (!rawArray[i]) {
      continue;
    }

    const Constructor = getConstructor(this.Constructor, rawArray[i]);

    const spreadDoc = handleSpreadDoc(rawArray[i], true);
    if (rawArray[i] !== spreadDoc) {
      rawArray[i] = spreadDoc;
    }

    if (rawArray[i] instanceof Subdocument) {
      // gh-15973: Clone if subdocument has a different parent, or if it already has a
      // different __index (e.g. reordered or duplicated in the array). If __index is null,
      // we can safely set it without cloning.
      if (rawArray[i][documentArrayParent] !== doc ||
          (rawArray[i].__index != null && rawArray[i].__index !== i)) {
        if (init) {
          const subdoc = new Constructor(null, value, initDocumentOptions, selected, i);
          rawArray[i] = subdoc.$init(rawArray[i]);
        } else {
          const subdoc = new Constructor(rawArray[i], value, undefined, undefined, i);
          rawArray[i] = subdoc;
        }
      }
      // Might not have the correct index yet, so ensure it does.
      if (rawArray[i].__index == null) {
        rawArray[i].$setIndex(i);
      }
    } else if (rawArray[i] != null) {
      if (init) {
        if (doc) {
          selected || (selected = scopePaths(this, doc.$__.selected, init));
        } else {
          selected = true;
        }

        subdoc = new Constructor(null, value, initDocumentOptions, selected, i);
        // Don't pass `path` to $init - it's only for this DocumentArray itself, not its element fields.
        // Element subdocuments use relative paths internally for change tracking.
        if (options.path != null) {
          options = { ...options };
          delete options.path;
        }
        rawArray[i] = subdoc.$init(rawArray[i], options);
      } else {
        if (typeof prev?.id === 'function') {
          subdoc = prev.id(rawArray[i]._id);
        }

        if (prev && subdoc && utils.deepEqual(subdoc.toObject(_toObjectOptions), rawArray[i])) {
          // handle resetting doc with existing id and same data
          subdoc.set(rawArray[i]);
          // if set() is hooked it will have no return value
          // see gh-746
          rawArray[i] = subdoc;
        } else {
          try {
            subdoc = new Constructor(rawArray[i], value, undefined,
              undefined, i);
            // if set() is hooked it will have no return value
            // see gh-746
            rawArray[i] = subdoc;
          } catch (error) {
            throw new CastError('embedded', rawArray[i],
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

SchemaDocumentArray.prototype.clone = function() {
  const options = Object.assign({}, this.options);
  const schematype = new this.constructor(
    this.path,
    this.schema,
    options,
    this.schemaOptions,
    this.parentSchema
  );
  schematype.validators = this.validators.slice();
  if (this.requiredValidator !== undefined) {
    schematype.requiredValidator = this.requiredValidator;
  }
  schematype.Constructor.discriminators = Object.assign({},
    this.Constructor.discriminators);
  schematype._appliedDiscriminators = this._appliedDiscriminators;
  return schematype;
};

/*!
 * ignore
 */

SchemaDocumentArray.prototype.applyGetters = function(value, scope) {
  return SchemaType.prototype.applyGetters.call(this, value, scope);
};

/**
 * Scopes paths selected in a query to this array.
 * Necessary for proper default application of subdocument values.
 *
 * @param {DocumentArrayPath} array the array to scope `fields` paths
 * @param {Object|undefined} fields the root fields selected in the query
 * @param {Boolean|undefined} init if we are being created part of a query result
 * @api private
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
        sub = sub.substring(2);
      }
      hasKeys || (hasKeys = true);
      selected[sub] = fields[key];
    }
  }

  return hasKeys && selected || undefined;
}

/*!
 * ignore
 */

SchemaDocumentArray.defaultOptions = {};

/**
 * Sets a default option for all DocumentArray instances.
 *
 * #### Example:
 *
 *     // Make all document arrays not have `_id` by default.
 *     mongoose.Schema.Types.DocumentArray.set('_id', false);
 *
 * @param {String} option The name of the option you'd like to set (e.g. trim, lowercase, etc...)
 * @param {Any} value The value of the option you'd like to set.
 * @return {void}
 * @function set
 * @static
 * @api public
 */

SchemaDocumentArray.set = SchemaType.set;

SchemaDocumentArray.setters = [];

/**
 * Attaches a getter for all DocumentArrayPath instances
 *
 * @param {Function} getter
 * @return {this}
 * @function get
 * @static
 * @api public
 */

SchemaDocumentArray.get = SchemaType.get;

/*!
 * Handle casting $elemMatch operators
 */

SchemaDocumentArray.prototype.$conditionalHandlers.$elemMatch = cast$elemMatch;

function cast$elemMatch(val, context) {
  const keys = Object.keys(val);
  const numKeys = keys.length;
  for (let i = 0; i < numKeys; ++i) {
    const key = keys[i];
    const value = val[key];
    if (isOperator(key) && value != null) {
      val[key] = this.castForQuery(key, value, context);
    }
  }

  // Is this an embedded discriminator and is the discriminator key set?
  // If so, use the discriminator schema. See gh-7449
  const discriminatorKey = this?.Constructor?.schema?.options?.discriminatorKey;
  const discriminators = this?.Constructor?.schema?.discriminators || {};
  if (discriminatorKey != null &&
      val[discriminatorKey] != null &&
      discriminators[val[discriminatorKey]] != null) {
    return cast(discriminators[val[discriminatorKey]], val, null, this?.$$context);
  }

  const schema = this.Constructor.schema ?? context.schema;
  return cast(schema, val, null, this?.$$context);
}

/**
 * Returns this schema type's representation in a JSON schema.
 *
 * @param [options]
 * @param [options.useBsonType=false] If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.
 * @returns {Object} JSON schema properties
 */

SchemaDocumentArray.prototype.toJSONSchema = function toJSONSchema(options) {
  const itemsTypeDefinition = createJSONSchemaTypeDefinition('object', 'object', options?.useBsonType, false);
  const isRequired = this.options.required && typeof this.options.required !== 'function';
  return {
    ...createJSONSchemaTypeDefinition('array', 'array', options?.useBsonType, isRequired),
    items: { ...itemsTypeDefinition, ...this.schema.toJSONSchema(options) }
  };
};

/*!
 * Module exports.
 */

module.exports = SchemaDocumentArray;
