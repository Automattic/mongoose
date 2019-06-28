'use strict';

const CastError = require('../../error/cast');
const StrictModeError = require('../../error/strict');
const ValidationError = require('../../error/validation');
const castNumber = require('../../cast/number');
const getEmbeddedDiscriminatorPath = require('./getEmbeddedDiscriminatorPath');
const handleImmutable = require('./handleImmutable');
const utils = require('../../utils');

/*!
 * Casts an update op based on the given schema
 *
 * @param {Schema} schema
 * @param {Object} obj
 * @param {Object} options
 * @param {Boolean} [options.overwrite] defaults to false
 * @param {Boolean|String} [options.strict] defaults to true
 * @param {Query} context passed to setters
 * @return {Boolean} true iff the update is non-empty
 */

module.exports = function castUpdate(schema, obj, options, context, filter) {
  if (!obj) {
    return undefined;
  }

  const ops = Object.keys(obj);
  let i = ops.length;
  const ret = {};
  let hasKeys;
  let val;
  let hasDollarKey = false;
  const overwrite = options.overwrite;

  filter = filter || {};

  while (i--) {
    const op = ops[i];
    // if overwrite is set, don't do any of the special $set stuff
    if (op[0] !== '$' && !overwrite) {
      // fix up $set sugar
      if (!ret.$set) {
        if (obj.$set) {
          ret.$set = obj.$set;
        } else {
          ret.$set = {};
        }
      }
      ret.$set[op] = obj[op];
      ops.splice(i, 1);
      if (!~ops.indexOf('$set')) ops.push('$set');
    } else if (op === '$set') {
      if (!ret.$set) {
        ret[op] = obj[op];
      }
    } else {
      ret[op] = obj[op];
    }
  }

  // cast each value
  i = ops.length;

  // if we get passed {} for the update, we still need to respect that when it
  // is an overwrite scenario
  if (overwrite) {
    hasKeys = true;
  }

  while (i--) {
    const op = ops[i];
    val = ret[op];
    hasDollarKey = hasDollarKey || op.startsWith('$');

    if (val &&
        typeof val === 'object' &&
        !Buffer.isBuffer(val) &&
        (!overwrite || hasDollarKey)) {
      hasKeys |= walkUpdatePath(schema, val, op, options, context, filter);
    } else if (overwrite && ret && typeof ret === 'object') {
      // if we are just using overwrite, cast the query and then we will
      // *always* return the value, even if it is an empty object. We need to
      // set hasKeys above because we need to account for the case where the
      // user passes {} and wants to clobber the whole document
      // Also, _walkUpdatePath expects an operation, so give it $set since that
      // is basically what we're doing
      walkUpdatePath(schema, ret, '$set', options, context, filter);
    } else {
      const msg = 'Invalid atomic update value for ' + op + '. '
          + 'Expected an object, received ' + typeof val;
      throw new Error(msg);
    }

    if (op.startsWith('$') && Object.keys(val).length === 0) {
      delete ret[op];
    }
  }

  return hasKeys && ret;
};

/*!
 * Walk each path of obj and cast its values
 * according to its schema.
 *
 * @param {Schema} schema
 * @param {Object} obj - part of a query
 * @param {String} op - the atomic operator ($pull, $set, etc)
 * @param {Object} options
 * @param {Boolean|String} [options.strict]
 * @param {Boolean} [options.omitUndefined]
 * @param {Query} context
 * @param {String} pref - path prefix (internal only)
 * @return {Bool} true if this path has keys to update
 * @api private
 */

function walkUpdatePath(schema, obj, op, options, context, filter, pref) {
  const strict = options.strict;
  const prefix = pref ? pref + '.' : '';
  const keys = Object.keys(obj);
  let i = keys.length;
  let hasKeys = false;
  let schematype;
  let key;
  let val;

  let aggregatedError = null;

  let useNestedStrict;
  if (options.useNestedStrict === undefined) {
    useNestedStrict = schema.options.useNestedStrict;
  } else {
    useNestedStrict = options.useNestedStrict;
  }

  while (i--) {
    key = keys[i];
    val = obj[key];

    if (val && val.constructor.name === 'Object') {
      // watch for embedded doc schemas
      schematype = schema._getSchema(prefix + key);

      if (handleImmutable(schematype, strict, obj, key, prefix + key)) {
        continue;
      }

      if (schematype && schematype.caster && op in castOps) {
        // embedded doc schema
        if ('$each' in val) {
          hasKeys = true;
          try {
            obj[key] = {
              $each: castUpdateVal(schematype, val.$each, op, key, context, prefix + key)
            };
          } catch (error) {
            aggregatedError = _handleCastError(error, context, key, aggregatedError);
          }

          if (val.$slice != null) {
            obj[key].$slice = val.$slice | 0;
          }

          if (val.$sort) {
            obj[key].$sort = val.$sort;
          }

          if (!!val.$position || val.$position === 0) {
            obj[key].$position = val.$position;
          }
        } else {
          try {
            obj[key] = castUpdateVal(schematype, val, op, key, context, prefix + key);
          } catch (error) {
            aggregatedError = _handleCastError(error, context, key, aggregatedError);
          }

          if (options.omitUndefined && obj[key] === void 0) {
            delete obj[key];
            continue;
          }

          hasKeys = true;
        }
      } else if ((op === '$currentDate') || (op in castOps && schematype)) {
        // $currentDate can take an object
        try {
          obj[key] = castUpdateVal(schematype, val, op, key, context, prefix + key);
        } catch (error) {
          aggregatedError = _handleCastError(error, context, key, aggregatedError);
        }

        if (options.omitUndefined && obj[key] === void 0) {
          delete obj[key];
          continue;
        }

        hasKeys = true;
      } else {
        const pathToCheck = (prefix + key);
        const v = schema._getPathType(pathToCheck);
        let _strict = strict;
        if (useNestedStrict &&
            v &&
            v.schema &&
            'strict' in v.schema.options) {
          _strict = v.schema.options.strict;
        }

        if (v.pathType === 'undefined') {
          if (_strict === 'throw') {
            throw new StrictModeError(pathToCheck);
          } else if (_strict) {
            delete obj[key];
            continue;
          }
        }

        // gh-2314
        // we should be able to set a schema-less field
        // to an empty object literal
        hasKeys |= walkUpdatePath(schema, val, op, options, context, filter, prefix + key) ||
          (utils.isObject(val) && Object.keys(val).length === 0);
      }
    } else {
      const checkPath = (key === '$each' || key === '$or' || key === '$and' || key === '$in') ?
        pref : prefix + key;
      schematype = schema._getSchema(checkPath);

      // You can use `$setOnInsert` with immutable keys
      if (op !== '$setOnInsert' &&
          handleImmutable(schematype, strict, obj, key, prefix + key)) {
        continue;
      }

      let pathDetails = schema._getPathType(checkPath);

      // If no schema type, check for embedded discriminators
      if (schematype == null) {
        const _res = getEmbeddedDiscriminatorPath(schema, obj, filter, checkPath);
        if (_res.schematype != null) {
          schematype = _res.schematype;
          pathDetails = _res.type;
        }
      }

      let isStrict = strict;
      if (useNestedStrict &&
          pathDetails &&
          pathDetails.schema &&
          'strict' in pathDetails.schema.options) {
        isStrict = pathDetails.schema.options.strict;
      }

      const skip = isStrict &&
        !schematype &&
        !/real|nested/.test(pathDetails.pathType);

      if (skip) {
        // Even if strict is `throw`, avoid throwing an error because of
        // virtuals because of #6731
        if (isStrict === 'throw' && schema.virtuals[checkPath] == null) {
          throw new StrictModeError(prefix + key);
        } else {
          delete obj[key];
        }
      } else {
        // gh-1845 temporary fix: ignore $rename. See gh-3027 for tracking
        // improving this.
        if (op === '$rename') {
          hasKeys = true;
          continue;
        }

        try {
          obj[key] = castUpdateVal(schematype, val, op, key, context, prefix + key);
        } catch (error) {
          aggregatedError = _handleCastError(error, context, key, aggregatedError);
        }

        if (Array.isArray(obj[key]) && (op === '$addToSet' || op === '$push') && key !== '$each') {
          if (schematype && schematype.caster && !schematype.caster.$isMongooseArray) {
            obj[key] = { $each: obj[key] };
          }
        }

        if (options.omitUndefined && obj[key] === void 0) {
          delete obj[key];
          continue;
        }

        hasKeys = true;
      }
    }
  }

  if (aggregatedError != null) {
    throw aggregatedError;
  }

  return hasKeys;
}

/*!
 * ignore
 */

function _handleCastError(error, query, key, aggregatedError) {
  if (typeof query !== 'object' || !query.options.multipleCastError) {
    throw error;
  }
  aggregatedError = aggregatedError || new ValidationError();
  aggregatedError.addError(key, error);
  return aggregatedError;
}

/*!
 * These operators should be cast to numbers instead
 * of their path schema type.
 */

const numberOps = {
  $pop: 1,
  $inc: 1
};

/*!
 * These ops require no casting because the RHS doesn't do anything.
 */

const noCastOps = {
  $unset: 1
};

/*!
 * These operators require casting docs
 * to real Documents for Update operations.
 */

const castOps = {
  $push: 1,
  $addToSet: 1,
  $set: 1,
  $setOnInsert: 1
};

/*!
 * ignore
 */

const overwriteOps = {
  $set: 1,
  $setOnInsert: 1
};

/*!
 * Casts `val` according to `schema` and atomic `op`.
 *
 * @param {SchemaType} schema
 * @param {Object} val
 * @param {String} op - the atomic operator ($pull, $set, etc)
 * @param {String} $conditional
 * @param {Query} context
 * @api private
 */

function castUpdateVal(schema, val, op, $conditional, context, path) {
  if (!schema) {
    // non-existing schema path
    if (op in numberOps) {
      try {
        return castNumber(val);
      } catch (err) {
        throw new CastError('number', val, path);
      }
    }
    return val;
  }

  const cond = schema.caster && op in castOps &&
      (utils.isObject(val) || Array.isArray(val));
  if (cond && !overwriteOps[op]) {
    // Cast values for ops that add data to MongoDB.
    // Ensures embedded documents get ObjectIds etc.
    let schemaArrayDepth = 0;
    let cur = schema;
    while (cur.$isMongooseArray) {
      ++schemaArrayDepth;
      cur = cur.caster;
    }
    let arrayDepth = 0;
    let _val = val;
    while (Array.isArray(_val)) {
      ++arrayDepth;
      _val = _val[0];
    }

    const additionalNesting = schemaArrayDepth - arrayDepth;
    while (arrayDepth < schemaArrayDepth) {
      val = [val];
      ++arrayDepth;
    }

    let tmp = schema.applySetters(Array.isArray(val) ? val : [val], context);

    for (let i = 0; i < additionalNesting; ++i) {
      tmp = tmp[0];
    }
    return tmp;
  }

  if (op in noCastOps) {
    return val;
  }
  if (op in numberOps) {
    // Null and undefined not allowed for $pop, $inc
    if (val == null) {
      throw new CastError('number', val, schema.path);
    }
    if (op === '$inc') {
      // Support `$inc` with long, int32, etc. (gh-4283)
      return schema.castForQueryWrapper({
        val: val,
        context: context
      });
    }
    try {
      return castNumber(val);
    } catch (error) {
      throw new CastError('number', val, schema.path);
    }
  }
  if (op === '$currentDate') {
    if (typeof val === 'object') {
      return {$type: val.$type};
    }
    return Boolean(val);
  }

  if (/^\$/.test($conditional)) {
    return schema.castForQueryWrapper({
      $conditional: $conditional,
      val: val,
      context: context
    });
  }

  if (overwriteOps[op]) {
    return schema.castForQueryWrapper({
      val: val,
      context: context,
      $skipQueryCastForUpdate: val != null && schema.$isMongooseArray && schema.$fullPath != null && !schema.$fullPath.match(/\d+$/)
    });
  }

  return schema.castForQueryWrapper({ val: val, context: context });
}
