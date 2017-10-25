'use strict';

var StrictModeError = require('../../error/strict');
var ValidationError = require('../../error/validation');
var utils = require('../../utils');

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

module.exports = function castUpdate(schema, obj, options, context) {
  if (!obj) {
    return undefined;
  }

  var ops = Object.keys(obj);
  var i = ops.length;
  var ret = {};
  var hasKeys;
  var val;
  var hasDollarKey = false;
  var overwrite = options.overwrite;

  while (i--) {
    var op = ops[i];
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
    op = ops[i];
    val = ret[op];
    hasDollarKey = hasDollarKey || op.charAt(0) === '$';
    if (val &&
        typeof val === 'object' &&
        (!overwrite || hasDollarKey)) {
      hasKeys |= walkUpdatePath(schema, val, op, options.strict, context);
    } else if (overwrite && ret && typeof ret === 'object') {
      // if we are just using overwrite, cast the query and then we will
      // *always* return the value, even if it is an empty object. We need to
      // set hasKeys above because we need to account for the case where the
      // user passes {} and wants to clobber the whole document
      // Also, _walkUpdatePath expects an operation, so give it $set since that
      // is basically what we're doing
      walkUpdatePath(schema, ret, '$set', options.strict, context);
    } else {
      var msg = 'Invalid atomic update value for ' + op + '. '
          + 'Expected an object, received ' + typeof val;
      throw new Error(msg);
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
 * @param {Boolean|String} strict
 * @param {Query} context
 * @param {String} pref - path prefix (internal only)
 * @return {Bool} true if this path has keys to update
 * @api private
 */

function walkUpdatePath(schema, obj, op, strict, context, pref) {
  var prefix = pref ? pref + '.' : '';
  var keys = Object.keys(obj);
  var i = keys.length;
  var hasKeys = false;
  var schematype;
  var key;
  var val;

  var hasError = false;
  var aggregatedError = new ValidationError();

  var useNestedStrict = schema.options.useNestedStrict;

  while (i--) {
    key = keys[i];
    val = obj[key];

    if (val && val.constructor.name === 'Object') {
      // watch for embedded doc schemas
      schematype = schema._getSchema(prefix + key);
      if (schematype && schematype.caster && op in castOps) {
        // embedded doc schema
        hasKeys = true;

        if ('$each' in val) {
          try {
            obj[key] = {
              $each: castUpdateVal(schematype, val.$each, op, context)
            };
          } catch (error) {
            hasError = true;
            _handleCastError(error, context, key, aggregatedError);
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
            obj[key] = castUpdateVal(schematype, val, op, context);
          } catch (error) {
            hasError = true;
            _handleCastError(error, context, key, aggregatedError);
          }
        }
      } else if ((op === '$currentDate') || (op in castOps && schematype)) {
        // $currentDate can take an object
        try {
          obj[key] = castUpdateVal(schematype, val, op, context);
        } catch (error) {
          hasError = true;
          _handleCastError(error, context, key, aggregatedError);
        }

        hasKeys = true;
      } else {
        var pathToCheck = (prefix + key);
        var v = schema._getPathType(pathToCheck);
        var _strict = strict;
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
        hasKeys |= walkUpdatePath(schema, val, op, strict, context, prefix + key) ||
          (utils.isObject(val) && Object.keys(val).length === 0);
      }
    } else {
      var checkPath = (key === '$each' || key === '$or' || key === '$and') ?
        pref : prefix + key;
      schematype = schema._getSchema(checkPath);

      var pathDetails = schema._getPathType(checkPath);
      var isStrict = strict;
      if (useNestedStrict &&
          pathDetails &&
          pathDetails.schema &&
          'strict' in pathDetails.schema.options) {
        isStrict = pathDetails.schema.options.strict;
      }

      var skip = isStrict &&
          !schematype &&
          !/real|nested/.test(pathDetails.pathType);

      if (skip) {
        if (isStrict === 'throw') {
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

        hasKeys = true;
        try {
          obj[key] = castUpdateVal(schematype, val, op, key, context);
        } catch (error) {
          hasError = true;
          _handleCastError(error, context, key, aggregatedError);
        }
      }
    }
  }

  if (hasError) {
    throw aggregatedError;
  }

  return hasKeys;
}

/*!
 * ignore
 */

function _handleCastError(error, query, key, aggregatedError) {
  if (!query.options.multipleCastError) {
    throw error;
  }
  aggregatedError.addError(key, error);
}

/*!
 * These operators should be cast to numbers instead
 * of their path schema type.
 */

var numberOps = {
  $pop: 1,
  $unset: 1,
  $inc: 1
};

/*!
 * These operators require casting docs
 * to real Documents for Update operations.
 */

var castOps = {
  $push: 1,
  $pushAll: 1,
  $addToSet: 1,
  $set: 1,
  $setOnInsert: 1
};

/*!
 * ignore
 */

var overwriteOps = {
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

function castUpdateVal(schema, val, op, $conditional, context) {
  if (!schema) {
    // non-existing schema path
    return op in numberOps
        ? Number(val)
        : val;
  }

  var cond = schema.caster && op in castOps &&
      (utils.isObject(val) || Array.isArray(val));
  if (cond) {
    // Cast values for ops that add data to MongoDB.
    // Ensures embedded documents get ObjectIds etc.
    var tmp = schema.cast(val);
    if (Array.isArray(val)) {
      val = tmp;
    } else if (Array.isArray(tmp)) {
      val = tmp[0];
    } else {
      val = tmp;
    }
    return val;
  }

  if (op in numberOps) {
    if (op === '$inc') {
      return schema.castForQueryWrapper({ val: val, context: context });
    }
    return Number(val);
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
      $skipQueryCastForUpdate: val != null && schema.$isMongooseArray
    });
  }

  return schema.castForQueryWrapper({ val: val, context: context });
}
