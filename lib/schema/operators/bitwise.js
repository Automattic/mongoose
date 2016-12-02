/*!
 * Module requirements.
 */

var CastError = require('../../error/cast');

/*!
 * ignore
 */

function handleBitwiseOperator(val) {
  var _this = this;
  if (Array.isArray(val)) {
    return val.map(function(v) {
      return _castNumber(_this.path, v);
    });
  } else if (Buffer.isBuffer(val)) {
    return val;
  }
  // Assume trying to cast to number
  return _castNumber(_this.path, val);
}

/*!
 * ignore
 */

function _castNumber(path, num) {
  var v = Number(num);
  if (isNaN(v)) {
    throw new CastError('number', num, path);
  }
  return v;
}

module.exports = handleBitwiseOperator;
