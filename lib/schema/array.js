'use strict';

/*!
 * Module dependencies.
 */

const $exists = require('./operators/exists');
const $type = require('./operators/type');
const MongooseError = require('../error/mongooseError');
const SchemaType = require('../schematype');
const CastError = SchemaType.CastError;
const Types = {
  Array: SchemaArray,
  Boolean: require('./boolean'),
  Date: require('./date'),
  Number: require('./number'),
  String: require('./string'),
  ObjectId: require('./objectid'),
  Buffer: require('./buffer'),
  Map: require('./map')
};
const Mixed = require('./mixed');
const cast = require('../cast');
const get = require('../helpers/get');
const util = require('util');
const utils = require('../utils');
const castToNumber = require('./operators/helpers').castToNumber;
const geospatial = require('./operators/geospatial');
const getDiscriminatorByValue = require('../queryhelpers').getDiscriminatorByValue;

let MongooseArray;
let EmbeddedDoc;

/**
 * Array SchemaType constructor
 *
 * @param {String} key
 * @param {SchemaType} cast
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaArray(key, cast, options, schemaOptions) {
  // lazy load
  EmbeddedDoc || (EmbeddedDoc = require('../types').Embedded);

  let typeKey = 'type';
  if (schemaOptions && schemaOptions.typeKey) {
    typeKey = schemaOptions.typeKey;
  }
  this.schemaOptions = schemaOptions;

  if (cast) {
    let castOptions = {};

    if (utils.isPOJO(cast)) {
      if (cast[typeKey]) {
        // support { type: Woot }
        castOptions = utils.clone(cast); // do not alter user arguments
        delete castOptions[typeKey];
        cast = cast[typeKey];
      } else {
        cast = Mixed;
      }
    }

    if (cast === Object) {
      cast = Mixed;
    }

    // support { type: 'String' }
    const name = typeof cast === 'string'
      ? cast
      : utils.getFunctionName(cast);

    const caster = name in Types
      ? Types[name]
      : cast;

    this.casterConstructor = caster;

    if (typeof caster === 'function' &&
        !caster.$isArraySubdocument &&
        !caster.$isSchemaMap) {
      this.caster = new caster(null, castOptions);
    } else {
      this.caster = caster;
    }

    if (!(this.caster instanceof EmbeddedDoc)) {
      this.caster.path = key;
    }
  }

  this.$isMongooseArray = true;

  SchemaType.call(this, key, options, 'Array');

  let defaultArr;
  let fn;

  if (this.defaultValue != null) {
    defaultArr = this.defaultValue;
    fn = typeof defaultArr === 'function';
  }

  if (!('defaultValue' in this) || this.defaultValue !== void 0) {
    const defaultFn = function() {
      let arr = [];
      if (fn) {
        arr = defaultArr.call(this);
      } else if (defaultArr != null) {
        arr = arr.concat(defaultArr);
      }
      // Leave it up to `cast()` to convert the array
      return arr;
    };
    defaultFn.$runBeforeSetters = true;
    this.default(defaultFn);
  }
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaArray.schemaName = 'Array';

/**
 * Options for all arrays.
 *
 * - `castNonArrays`: `true` by default. If `false`, Mongoose will throw a CastError when a value isn't an array. If `true`, Mongoose will wrap the provided value in an array before casting.
 *
 * @static options
 * @api public
 */

SchemaArray.options = { castNonArrays: true };

/*!
 * Inherits from SchemaType.
 */
SchemaArray.prototype = Object.create(SchemaType.prototype);
SchemaArray.prototype.constructor = SchemaArray;

/*!
 * ignore
 */

SchemaArray._checkRequired = SchemaType.prototype.checkRequired;

/**
 * Override the function the required validator uses to check whether an array
 * passes the `required` check.
 *
 * ####Example:
 *
 *     // Require non-empty array to pass `required` check
 *     mongoose.Schema.Types.Array.checkRequired(v => Array.isArray(v) && v.length);
 *
 *     const M = mongoose.model({ arr: { type: Array, required: true } });
 *     new M({ arr: [] }).validateSync(); // `null`, validation fails!
 *
 * @param {Function} fn
 * @return {Function}
 * @function checkRequired
 * @static
 * @api public
 */

SchemaArray.checkRequired = SchemaType.checkRequired;

/**
 * Check if the given value satisfies the `required` validator.
 *
 * @param {Any} value
 * @param {Document} doc
 * @return {Boolean}
 * @api public
 */

SchemaArray.prototype.checkRequired = function checkRequired(value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return !!value;
  }

  // `require('util').inherits()` does **not** copy static properties, and
  // plugins like mongoose-float use `inherits()` for pre-ES6.
  const _checkRequired = typeof this.constructor.checkRequired == 'function' ?
    this.constructor.checkRequired() :
    SchemaArray.checkRequired();

  return _checkRequired(value);
};

/**
 * Adds an enum validator if this is an array of strings. Equivalent to
 * `SchemaString.prototype.enum()`
 *
 * @param {String|Object} [args...] enumeration values
 * @return {SchemaType} this
 */

SchemaArray.prototype.enum = function() {
  const instance = get(this, 'caster.instance');
  if (instance !== 'String') {
    throw new Error('`enum` can only be set on an array of strings, not ' + instance);
  }
  this.caster.enum.apply(this.caster, arguments);
  return this;
};

/**
 * Overrides the getters application for the population special-case
 *
 * @param {Object} value
 * @param {Object} scope
 * @api private
 */

SchemaArray.prototype.applyGetters = function(value, scope) {
  if (this.caster.options && this.caster.options.ref) {
    // means the object id was populated
    return value;
  }

  return SchemaType.prototype.applyGetters.call(this, value, scope);
};

/**
 * Casts values for set().
 *
 * @param {Object} value
 * @param {Document} doc document that triggers the casting
 * @param {Boolean} init whether this is an initialization cast
 * @api private
 */

SchemaArray.prototype.cast = function(value, doc, init) {
  // lazy load
  MongooseArray || (MongooseArray = require('../types').Array);

  let i;
  let l;

  if (Array.isArray(value)) {
    if (!value.length && doc) {
      const indexes = doc.schema.indexedPaths();

      for (i = 0, l = indexes.length; i < l; ++i) {
        const pathIndex = indexes[i][0][this.path];
        if (pathIndex === '2dsphere' || pathIndex === '2d') {
          return;
        }
      }
    }

    if (!(value && value.isMongooseArray)) {
      value = new MongooseArray(value, this.path, doc);
    } else if (value && value.isMongooseArray) {
      // We need to create a new array, otherwise change tracking will
      // update the old doc (gh-4449)
      value = new MongooseArray(value, this.path, doc);
    }

    if (this.caster && this.casterConstructor !== Mixed) {
      try {
        for (i = 0, l = value.length; i < l; i++) {
          value[i] = this.caster.cast(value[i], doc, init);
        }
      } catch (e) {
        // rethrow
        throw new CastError('[' + e.kind + ']', util.inspect(value), this.path, e);
      }
    }

    return value;
  }

  if (init || SchemaArray.options.castNonArrays) {
    // gh-2442: if we're loading this from the db and its not an array, mark
    // the whole array as modified.
    if (!!doc && !!init) {
      doc.markModified(this.path);
    }
    return this.cast([value], doc, init);
  }

  throw new CastError('Array', util.inspect(value), this.path);
};

/*!
 * Ignore
 */

SchemaArray.prototype.discriminator = function(name, schema) {
  let arr = this; // eslint-disable-line consistent-this
  while (arr.$isMongooseArray && !arr.$isMongooseDocumentArray) {
    arr = arr.casterConstructor;
    if (arr == null || typeof arr === 'function') {
      throw new MongooseError('You can only add an embedded discriminator on ' +
        'a document array, ' + this.path + ' is a plain array');
    }
  }
  return arr.discriminator(name, schema);
};

/*!
 * ignore
 */

SchemaArray.prototype.clone = function() {
  const options = Object.assign({}, this.options);
  const schematype = new this.constructor(this.path, this.caster, options, this.schemaOptions);
  schematype.validators = this.validators.slice();
  return schematype;
};

/**
 * Casts values for queries.
 *
 * @param {String} $conditional
 * @param {any} [value]
 * @api private
 */

SchemaArray.prototype.castForQuery = function($conditional, value) {
  let handler;
  let val;

  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];

    if (!handler) {
      throw new Error('Can\'t use ' + $conditional + ' with Array.');
    }

    val = handler.call(this, value);
  } else {
    val = $conditional;
    let Constructor = this.casterConstructor;

    if (val &&
        Constructor.discriminators &&
        Constructor.schema &&
        Constructor.schema.options &&
        Constructor.schema.options.discriminatorKey) {
      if (typeof val[Constructor.schema.options.discriminatorKey] === 'string' &&
          Constructor.discriminators[val[Constructor.schema.options.discriminatorKey]]) {
        Constructor = Constructor.discriminators[val[Constructor.schema.options.discriminatorKey]];
      } else {
        const constructorByValue = getDiscriminatorByValue(Constructor, val[Constructor.schema.options.discriminatorKey]);
        if (constructorByValue) {
          Constructor = constructorByValue;
        }
      }
    }

    const proto = this.casterConstructor.prototype;
    let method = proto && (proto.castForQuery || proto.cast);
    if (!method && Constructor.castForQuery) {
      method = Constructor.castForQuery;
    }
    const caster = this.caster;

    if (Array.isArray(val)) {
      this.setters.reverse().forEach(setter => {
        val = setter.call(this, val, this);
      });
      val = val.map(function(v) {
        if (utils.isObject(v) && v.$elemMatch) {
          return v;
        }
        if (method) {
          v = method.call(caster, v);
          return v;
        }
        if (v != null) {
          v = new Constructor(v);
          return v;
        }
        return v;
      });
    } else if (method) {
      val = method.call(caster, val);
    } else if (val != null) {
      val = new Constructor(val);
    }
  }

  return val;
};

function cast$all(val) {
  if (!Array.isArray(val)) {
    val = [val];
  }

  val = val.map(function(v) {
    if (utils.isObject(v)) {
      const o = {};
      o[this.path] = v;
      return cast(this.casterConstructor.schema, o)[this.path];
    }
    return v;
  }, this);

  return this.castForQuery(val);
}

function cast$elemMatch(val) {
  const keys = Object.keys(val);
  const numKeys = keys.length;
  for (let i = 0; i < numKeys; ++i) {
    const key = keys[i];
    const value = val[key];
    if (key.indexOf('$') === 0 && value) {
      val[key] = this.castForQuery(key, value);
    }
  }

  // Is this an embedded discriminator and is the discriminator key set?
  // If so, use the discriminator schema. See gh-7449
  const discriminatorKey = get(this,
    'casterConstructor.schema.options.discriminatorKey');
  const discriminators = get(this, 'casterConstructor.schema.discriminators', {});
  if (discriminatorKey != null &&
      val[discriminatorKey] != null &&
      discriminators[val[discriminatorKey]] != null) {
    return cast(discriminators[val[discriminatorKey]], val);
  }

  return cast(this.casterConstructor.schema, val);
}

const handle = SchemaArray.prototype.$conditionalHandlers = {};

handle.$all = cast$all;
handle.$options = String;
handle.$elemMatch = cast$elemMatch;
handle.$geoIntersects = geospatial.cast$geoIntersects;
handle.$or = handle.$and = function(val) {
  if (!Array.isArray(val)) {
    throw new TypeError('conditional $or/$and require array');
  }

  const ret = [];
  for (let i = 0; i < val.length; ++i) {
    ret.push(cast(this.casterConstructor.schema, val[i]));
  }

  return ret;
};

handle.$near =
handle.$nearSphere = geospatial.cast$near;

handle.$within =
handle.$geoWithin = geospatial.cast$within;

handle.$size =
handle.$minDistance =
handle.$maxDistance = castToNumber;

handle.$exists = $exists;
handle.$type = $type;

handle.$eq =
handle.$gt =
handle.$gte =
handle.$lt =
handle.$lte =
handle.$ne =
handle.$regex = SchemaArray.prototype.castForQuery;

// `$in` is special because you can also include an empty array in the query
// like `$in: [1, []]`, see gh-5913
handle.$nin = SchemaType.prototype.$conditionalHandlers.$nin;
handle.$in = SchemaType.prototype.$conditionalHandlers.$in;

/*!
 * Module exports.
 */

module.exports = SchemaArray;
