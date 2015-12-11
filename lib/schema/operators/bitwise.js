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
      return _castNumber(_this, v);
    });
  } else if (Buffer.isBuffer(val)) {
    return val;
  } else {
    // Assume trying to cast to number
    return _castNumber(_this, val);
  }
}

/*!
 * ignore
 */

function _castNumber(_this, num) {
  var v = Number(num);
  if (isNaN(v)) {
    throw new CastError('number', num, _this.path);
  }
  return v;
}

module.exports = handleBitwiseOperator;
