/*!
 * Module requirements.
 */

var castArraysOfNumbers = require('./helpers').castArraysOfNumbers;
var castToNumber = require('./helpers').castToNumber;

/*!
 * ignore
 */

exports.cast$geoIntersects = cast$geoIntersects;
exports.cast$near = cast$near;
exports.cast$within = cast$within;

function cast$near(val) {
  var SchemaArray = require('../array');

  if (Array.isArray(val)) {
    castArraysOfNumbers(val, this);
    return val;
  }

  if (val && val.$geometry) {
    return cast$geometry(val, this);
  }

  return SchemaArray.prototype.castForQuery.call(this, val);
}

function cast$geometry(val, self) {
  switch (val.$geometry.type) {
    case 'Polygon':
    case 'LineString':
    case 'Point':
      castArraysOfNumbers(val.$geometry.coordinates, self);
      break;
    default:
      // ignore unknowns
      break;
  }

  if (val.$maxDistance) {
    val.$maxDistance = castToNumber.call(self, val.$maxDistance);
  }

  return val;
}

function cast$within(val) {
  var _this = this;

  if (val.$maxDistance) {
    val.$maxDistance = castToNumber.call(_this, val.$maxDistance);
  }

  if (val.$box || val.$polygon) {
    var type = val.$box ? '$box' : '$polygon';
    val[type].forEach(function(arr) {
      if (!Array.isArray(arr)) {
        var msg = 'Invalid $within $box argument. '
            + 'Expected an array, received ' + arr;
        throw new TypeError(msg);
      }
      arr.forEach(function(v, i) {
        arr[i] = castToNumber.call(this, v);
      });
    });
  } else if (val.$center || val.$centerSphere) {
    type = val.$center ? '$center' : '$centerSphere';
    val[type].forEach(function(item, i) {
      if (Array.isArray(item)) {
        item.forEach(function(v, j) {
          item[j] = castToNumber.call(this, v);
        });
      } else {
        val[type][i] = castToNumber.call(this, item);
      }
    });
  } else if (val.$geometry) {
    cast$geometry(val, this);
  }

  return val;
}

function cast$geoIntersects(val) {
  var geo = val.$geometry;
  if (!geo) {
    return;
  }

  cast$geometry(val, this);
  return val;
}
