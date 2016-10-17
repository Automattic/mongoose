/*!
 * Module dependencies.
 */

var utils = require('./utils');
var Types = require('./schema/index');

var ALLOWED_GEOWITHIN_GEOJSON_TYPES = ['Polygon', 'MultiPolygon'];

/**
 * Handles internal casting for queries
 *
 * @param {Schema} schema
 * @param {Object} obj Object to cast
 * @api private
 */
module.exports = function cast(schema, obj) {
  var paths = Object.keys(obj),
      i = paths.length,
      _keys,
      any$conditionals,
      schematype,
      nested,
      path,
      type,
      val;

  while (i--) {
    path = paths[i];
    val = obj[path];

    if (path === '$or' || path === '$nor' || path === '$and') {
      var k = val.length;

      while (k--) {
        val[k] = cast(schema, val[k]);
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
    } else if (path === '$elemMatch') {
      val = cast(schema, val);
    } else {
      if (!schema) {
        // no casting for Mixed types
        continue;
      }

      schematype = schema.path(path);

      if (!schematype) {
        // Handle potential embedded array queries
        var split = path.split('.'),
            j = split.length,
            pathFirstHalf,
            pathLastHalf,
            remainingConds;

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
            obj[path] = cast(schematype.caster.schema, remainingConds)[pathLastHalf];
          } else {
            obj[path] = val;
          }
          continue;
        }

        if (utils.isObject(val)) {
          // handle geo schemas that use object notation
          // { loc: { long: Number, lat: Number }

          var geo = '';
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

          if (!geo) {
            continue;
          }

          var numbertype = new Types.Number('__QueryCasting__');
          var value = val[geo];

          if (val.$maxDistance != null) {
            val.$maxDistance = numbertype.castForQuery(val.$maxDistance);
          }
          if (val.$minDistance != null) {
            val.$minDistance = numbertype.castForQuery(val.$minDistance);
          }

          if (geo === '$within') {
            var withinType = value.$center
                || value.$centerSphere
                || value.$box
                || value.$polygon;

            if (!withinType) {
              throw new Error('Bad $within paramater: ' + JSON.stringify(val));
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
              value.$maxDistance = numbertype.castForQuery(value.$maxDistance);
            }
            if (value.$minDistance != null) {
              value.$minDistance = numbertype.castForQuery(value.$minDistance);
            }
            if (utils.isMongooseObject(value.$geometry)) {
              value.$geometry = value.$geometry.toObject({ transform: false });
            }
            value = value.$geometry.coordinates;
          } else if (geo === '$geoWithin') {
            if (value.$geometry) {
              if (utils.isMongooseObject(value.$geometry)) {
                value.$geometry = value.$geometry.toObject({ virtuals: false });
              }
              var geoWithinType = value.$geometry.type;
              if (ALLOWED_GEOWITHIN_GEOJSON_TYPES.indexOf(geoWithinType) === -1) {
                throw new Error('Invalid geoJSON type for $geoWithin "' +
                  geoWithinType + '", must be "Polygon" or "MultiPolygon"');
              }
              value = value.$geometry.coordinates;
            } else {
              value = value.$box || value.$polygon || value.$center ||
                value.$centerSphere;
              if (utils.isMongooseObject(value)) {
                value = value.toObject({ virtuals: false });
              }
            }
          }

          _cast(value, numbertype);
        }
      } else if (val === null || val === undefined) {
        obj[path] = null;
        continue;
      } else if (val.constructor.name === 'Object') {
        any$conditionals = Object.keys(val).some(function(k) {
          return k.charAt(0) === '$' && k !== '$id' && k !== '$ref';
        });

        if (!any$conditionals) {
          obj[path] = schematype.castForQuery(val);
        } else {
          var ks = Object.keys(val),
              $cond;

          k = ks.length;

          while (k--) {
            $cond = ks[k];
            nested = val[$cond];

            if ($cond === '$exists') {
              if (typeof nested !== 'boolean') {
                throw new Error('$exists parameter must be Boolean');
              }
              continue;
            }

            if ($cond === '$type') {
              if (typeof nested !== 'number' && typeof nested !== 'string') {
                throw new Error('$type parameter must be number or string');
              }
              continue;
            }

            if ($cond === '$not') {
              if (nested && schematype && !schematype.caster) {
                _keys = Object.keys(nested);
                if (_keys.length && _keys[0].charAt(0) === '$') {
                  for (var key in nested) {
                    nested[key] = schematype.castForQuery(key, nested[key]);
                  }
                } else {
                  val[$cond] = schematype.castForQuery($cond, nested);
                }
                continue;
              }
              cast(schematype.caster ? schematype.caster.schema : schema, nested);
            } else {
              val[$cond] = schematype.castForQuery($cond, nested);
            }
          }
        }
      } else {
        obj[path] = schematype.castForQuery(val);
      }
    }
  }

  return obj;
};

function _cast(val, numbertype) {
  if (Array.isArray(val)) {
    val.forEach(function(item, i) {
      if (Array.isArray(item) || utils.isObject(item)) {
        return _cast(item, numbertype);
      }
      val[i] = numbertype.castForQuery(item);
    });
  } else {
    var nearKeys = Object.keys(val);
    var nearLen = nearKeys.length;
    while (nearLen--) {
      var nkey = nearKeys[nearLen];
      var item = val[nkey];
      if (Array.isArray(item) || utils.isObject(item)) {
        _cast(item, numbertype);
        val[nkey] = item;
      } else {
        val[nkey] = numbertype.castForQuery(item);
      }
    }
  }
}
