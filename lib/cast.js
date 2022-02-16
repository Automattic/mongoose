'use strict';

/*!
 * Module dependencies.
 */

const CastError = require('./error/cast');
const StrictModeError = require('./error/strict');
const Types = require('./schema/index');
const cast$expr = require('./helpers/query/cast$expr');
const castTextSearch = require('./schema/operators/text');
const get = require('./helpers/get');
const getConstructorName = require('./helpers/getConstructorName');
const getSchemaDiscriminatorByValue = require('./helpers/discriminator/getSchemaDiscriminatorByValue');
const isOperator = require('./helpers/query/isOperator');
const util = require('util');
const isObject = require('./helpers/isObject');
const isMongooseObject = require('./helpers/isMongooseObject');

const ALLOWED_GEOWITHIN_GEOJSON_TYPES = ['Polygon', 'MultiPolygon'];

/**
 * Handles internal casting for query filters.
 *
 * @param {Schema} schema
 * @param {Object} obj Object to cast
 * @param {Object} options the query options
 * @param {Query} context passed to setters
 * @api private
 */
module.exports = function cast(schema, obj, options, context) {
  if (Array.isArray(obj)) {
    throw new Error('Query filter must be an object, got an array ', util.inspect(obj));
  }

  if (obj == null) {
    return obj;
  }

  if (schema != null && schema.discriminators != null && obj[schema.options.discriminatorKey] != null) {
    schema = getSchemaDiscriminatorByValue(schema, obj[schema.options.discriminatorKey]) || schema;
  }

  const paths = Object.keys(obj);
  let i = paths.length;
  let _keys;
  let any$conditionals;
  let schematype;
  let nested;
  let path;
  let type;
  let val;

  options = options || {};

  while (i--) {
    path = paths[i];
    val = obj[path];

    if (path === '$or' || path === '$nor' || path === '$and') {
      if (!Array.isArray(val)) {
        throw new CastError('Array', val, path);
      }
      for (let k = 0; k < val.length; ++k) {
        if (val[k] == null || typeof val[k] !== 'object') {
          throw new CastError('Object', val[k], path + '.' + k);
        }
        val[k] = cast(schema, val[k], options, context);
      }
    } else if (path === '$where') {
      type = typeof val;

      if (type !== 'string' && type !== 'function') {
        throw new Error('Must have a string or function for $where');
      }

      if (type === 'function') {
        obj[path] = val.toString();
      }

      continue;
    } else if (path === '$expr') {
      val = cast$expr(val, schema);
      continue;
    } else if (path === '$elemMatch') {
      val = cast(schema, val, options, context);
    } else if (path === '$text') {
      val = castTextSearch(val, path);
    } else {
      if (!schema) {
        // no casting for Mixed types
        continue;
      }

      schematype = schema.path(path);

      // Check for embedded discriminator paths
      if (!schematype) {
        const split = path.split('.');
        let j = split.length;
        while (j--) {
          const pathFirstHalf = split.slice(0, j).join('.');
          const pathLastHalf = split.slice(j).join('.');
          const _schematype = schema.path(pathFirstHalf);
          const discriminatorKey = _schematype &&
            _schematype.schema &&
            _schematype.schema.options &&
            _schematype.schema.options.discriminatorKey;

          // gh-6027: if we haven't found the schematype but this path is
          // underneath an embedded discriminator and the embedded discriminator
          // key is in the query, use the embedded discriminator schema
          if (_schematype != null &&
            (_schematype.schema && _schematype.schema.discriminators) != null &&
            discriminatorKey != null &&
            pathLastHalf !== discriminatorKey) {
            const discriminatorVal = get(obj, pathFirstHalf + '.' + discriminatorKey);
            if (discriminatorVal != null) {
              schematype = _schematype.schema.discriminators[discriminatorVal].
                path(pathLastHalf);
            }
          }
        }
      }

      if (!schematype) {
        // Handle potential embedded array queries
        const split = path.split('.');
        let j = split.length;
        let pathFirstHalf;
        let pathLastHalf;
        let remainingConds;

        // Find the part of the var path that is a path of the Schema
        while (j--) {
          pathFirstHalf = split.slice(0, j).join('.');
          schematype = schema.path(pathFirstHalf);
          if (schematype) {
            break;
          }
        }

        // If a substring of the input path resolves to an actual real path...
        if (schematype) {
          // Apply the casting; similar code for $elemMatch in schema/array.js
          if (schematype.caster && schematype.caster.schema) {
            remainingConds = {};
            pathLastHalf = split.slice(j).join('.');
            remainingConds[pathLastHalf] = val;

            const ret = cast(schematype.caster.schema, remainingConds, options, context)[pathLastHalf];
            if (ret === void 0) {
              delete obj[path];
            } else {
              obj[path] = ret;
            }
          } else {
            obj[path] = val;
          }
          continue;
        }

        if (isObject(val)) {
          // handle geo schemas that use object notation
          // { loc: { long: Number, lat: Number }

          let geo = '';
          if (val.$near) {
            geo = '$near';
          } else if (val.$nearSphere) {
            geo = '$nearSphere';
          } else if (val.$within) {
            geo = '$within';
          } else if (val.$geoIntersects) {
            geo = '$geoIntersects';
          } else if (val.$geoWithin) {
            geo = '$geoWithin';
          }

          if (geo) {
            const numbertype = new Types.Number('__QueryCasting__');
            let value = val[geo];

            if (val.$maxDistance != null) {
              val.$maxDistance = numbertype.castForQueryWrapper({
                val: val.$maxDistance,
                context: context
              });
            }
            if (val.$minDistance != null) {
              val.$minDistance = numbertype.castForQueryWrapper({
                val: val.$minDistance,
                context: context
              });
            }

            if (geo === '$within') {
              const withinType = value.$center
                  || value.$centerSphere
                  || value.$box
                  || value.$polygon;

              if (!withinType) {
                throw new Error('Bad $within parameter: ' + JSON.stringify(val));
              }

              value = withinType;
            } else if (geo === '$near' &&
                typeof value.type === 'string' && Array.isArray(value.coordinates)) {
              // geojson; cast the coordinates
              value = value.coordinates;
            } else if ((geo === '$near' || geo === '$nearSphere' || geo === '$geoIntersects') &&
                value.$geometry && typeof value.$geometry.type === 'string' &&
                Array.isArray(value.$geometry.coordinates)) {
              if (value.$maxDistance != null) {
                value.$maxDistance = numbertype.castForQueryWrapper({
                  val: value.$maxDistance,
                  context: context
                });
              }
              if (value.$minDistance != null) {
                value.$minDistance = numbertype.castForQueryWrapper({
                  val: value.$minDistance,
                  context: context
                });
              }
              if (isMongooseObject(value.$geometry)) {
                value.$geometry = value.$geometry.toObject({
                  transform: false,
                  virtuals: false
                });
              }
              value = value.$geometry.coordinates;
            } else if (geo === '$geoWithin') {
              if (value.$geometry) {
                if (isMongooseObject(value.$geometry)) {
                  value.$geometry = value.$geometry.toObject({ virtuals: false });
                }
                const geoWithinType = value.$geometry.type;
                if (ALLOWED_GEOWITHIN_GEOJSON_TYPES.indexOf(geoWithinType) === -1) {
                  throw new Error('Invalid geoJSON type for $geoWithin "' +
                    geoWithinType + '", must be "Polygon" or "MultiPolygon"');
                }
                value = value.$geometry.coordinates;
              } else {
                value = value.$box || value.$polygon || value.$center ||
                  value.$centerSphere;
                if (isMongooseObject(value)) {
                  value = value.toObject({ virtuals: false });
                }
              }
            }

            _cast(value, numbertype, context);
            continue;
          }
        }

        if (schema.nested[path]) {
          continue;
        }

        const strict = 'strict' in options ? options.strict : schema.options.strict;
        const strictQuery = 'strictQuery' in options ?
          options.strictQuery :
          'strict' in options ?
            options.strict :
            'strict' in schema._userProvidedOptions ? schema._userProvidedOptions.strict :
              schema.options.strictQuery;
        if (options.upsert && strict) {
          if (strict === 'throw') {
            throw new StrictModeError(path);
          }
          throw new StrictModeError(path, 'Path "' + path + '" is not in ' +
            'schema, strict mode is `true`, and upsert is `true`.');
        } if (strictQuery === 'throw') {
          throw new StrictModeError(path, 'Path "' + path + '" is not in ' +
            'schema and strictQuery is \'throw\'.');
        } else if (strictQuery) {
          delete obj[path];
        }
      } else if (val == null) {
        continue;
      } else if (getConstructorName(val) === 'Object') {
        any$conditionals = Object.keys(val).some(isOperator);

        if (!any$conditionals) {
          obj[path] = schematype.castForQueryWrapper({
            val: val,
            context: context
          });
        } else {
          const ks = Object.keys(val);
          let $cond;

          let k = ks.length;

          while (k--) {
            $cond = ks[k];
            nested = val[$cond];

            if ($cond === '$not') {
              if (nested && schematype) {
                _keys = Object.keys(nested);
                if (_keys.length && isOperator(_keys[0])) {
                  for (const key in nested) {
                    nested[key] = schematype.castForQueryWrapper({
                      $conditional: key,
                      val: nested[key],
                      context: context
                    });
                  }
                } else {
                  val[$cond] = schematype.castForQueryWrapper({
                    $conditional: $cond,
                    val: nested,
                    context: context
                  });
                }
                continue;
              }
            } else {
              val[$cond] = schematype.castForQueryWrapper({
                $conditional: $cond,
                val: nested,
                context: context
              });
            }
          }
        }
      } else if (Array.isArray(val) && ['Buffer', 'Array'].indexOf(schematype.instance) === -1) {
        const casted = [];
        const valuesArray = val;

        for (const _val of valuesArray) {
          casted.push(schematype.castForQueryWrapper({
            val: _val,
            context: context
          }));
        }

        obj[path] = { $in: casted };
      } else {
        obj[path] = schematype.castForQueryWrapper({
          val: val,
          context: context
        });
      }
    }
  }

  return obj;
};

function _cast(val, numbertype, context) {
  if (Array.isArray(val)) {
    val.forEach(function(item, i) {
      if (Array.isArray(item) || isObject(item)) {
        return _cast(item, numbertype, context);
      }
      val[i] = numbertype.castForQueryWrapper({ val: item, context: context });
    });
  } else {
    const nearKeys = Object.keys(val);
    let nearLen = nearKeys.length;
    while (nearLen--) {
      const nkey = nearKeys[nearLen];
      const item = val[nkey];
      if (Array.isArray(item) || isObject(item)) {
        _cast(item, numbertype, context);
        val[nkey] = item;
      } else {
        val[nkey] = numbertype.castForQuery({ val: item, context: context });
      }
    }
  }
}