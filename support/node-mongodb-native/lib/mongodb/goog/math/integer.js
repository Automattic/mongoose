// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Copyright 2009 Google Inc. All Rights Reserved

/**
 * @fileoverview Defines an exports.Integer class for representing (potentially)
 * infinite length two's-complement integer values.
 *
 * For the specific case of 64-bit integers, use Long, which is more
 * efficient.
 *
 */

var chr = String.fromCharCode;

/**
 * Constructs a two's-complement integer an array containing bits of the
 * integer in 32-bit (signed) pieces, given in little-endian order (i.e.,
 * lowest-order bits in the first piece), and the sign of -1 or 0.
 *
 * See the from* functions below for other convenient ways of constructing
 * exports.Integers.
 *
 * The internal representation of an integer is an array of 32-bit signed
 * pieces, along with a sign (0 or -1) that indicates the contents of all the
 * other 32-bit pieces out to infinity.  We use 32-bit pieces because these are
 * the size of integers on which Javascript performs bit-operations.  For
 * operations like addition and multiplication, we split each number into 16-bit
 * pieces, which can easily be multiplied within Javascript's floating-point
 * representation without overflow or change in sign.
 *
 * @constructor
 * @param {Array.<number>} bits Array containing the bits of the number.
 * @param {number} sign The sign of the number: -1 for negative and 0 positive.
 */
exports.Integer = function(bits, sign) {
  /**
   * @type {Array.<number>}
   * @private
   */
  this.bits_ = [];

  /**
   * @type {number}
   * @private
   */
  this.sign_ = sign;

  // Copy the 32-bit signed integer values passed in.  We prune out those at the
  // top that equal the sign since they are redundant.
  var top = true;
  for (var i = bits.length - 1; i >= 0; i--) {
    var val = bits[i] | 0;
    if (!top || val != sign) {
      this.bits_[i] = val;
      top = false;
    }
  }
};


// NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
// from* methods on which they depend.


/**
 * A cache of the exports.Integer representations of small integer values.
 * @type {Object}
 * @private
 */
exports.Integer.INT_CACHE_ = {};


/**
 * Returns an exports.Integer representing the given (32-bit) integer value.
 * @param {number} value A 32-bit integer value.
 * @return {exports.Integer} The corresponding exports.Integer value.
 */
exports.Integer.fromInt = function(value) {
  if (-128 <= value && value < 128) {
    var cachedObj = exports.Integer.INT_CACHE_[value];
    if (cachedObj) {
      return cachedObj;
    }
  }

  var obj = new exports.Integer([value | 0], value < 0 ? -1 : 0);
  if (-128 <= value && value < 128) {
    exports.Integer.INT_CACHE_[value] = obj;
  }
  return obj;
};


/**
 * Returns an exports.Integer representing the given value, provided that it is a finite
 * number.  Otherwise, zero is returned.
 * @param {number} value The value in question.
 * @return {exports.Integer} The corresponding exports.Integer value.
 */
exports.Integer.fromNumber = function(value) {
  if (isNaN(value) || !isFinite(value)) {
    return exports.Integer.ZERO;
  } else if (value < 0) {
    return exports.Integer.fromNumber(-value).negate();
  } else {
    var bits = [];
    var pow = 1;
    for (var i = 0; value >= pow; i++) {
      bits[i] = (value / pow) | 0;
      pow *= exports.Integer.TWO_PWR_32_DBL_;
    }
    return new exports.Integer(bits, 0);
  }
};


/**
 * Returns a exports.Integer representing the value that comes by concatenating the
 * given entries, each is assumed to be 32 signed bits, given in little-endian
 * order (lowest order bits in the lowest index), and sign-extending the highest
 * order 32-bit value.
 * @param {Array.<number>} bits The bits of the number, in 32-bit signed pieces,
 *     in little-endian order.
 * @return {exports.Integer} The corresponding exports.Integer value.
 */
exports.Integer.fromBits = function(bits) {
  var high = bits[bits.length - 1];
  return new exports.Integer(bits, high & (1 << 31) ? -1 : 0);
};

/**
 * Returns an exports.Integer representation of the given string, written using the
 * given radix.
 * @param {string} str The textual representation of the exports.Integer.
 * @param {number} opt_radix The radix in which the text is written.
 * @return {exports.Integer} The corresponding exports.Integer value.
 */
exports.Integer.fromString = function(str, opt_radix) {
  if (str.length == 0) {
    throw Error('number format error: empty string');
  }

  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw Error('radix out of range: ' + radix);
  }

  if (str.charAt(0) == '-') {
    return exports.Integer.fromString(str.substring(1), radix).negate();
  } else if (str.indexOf('-') >= 0) {
    throw Error('number format error: interior "-" character');
  }

  // Do several (8) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated div.
  var radixToPower = exports.Integer.fromNumber(Math.pow(radix, 8));

  var result = exports.Integer.ZERO;
  for (var i = 0; i < str.length; i += 8) {
    var size = Math.min(8, str.length - i);
    var value = parseInt(str.substring(i, i + size), radix);
    if (size < 8) {
      var power = exports.Integer.fromNumber(Math.pow(radix, size));
      result = result.multiply(power).add(exports.Integer.fromNumber(value));
    } else {
      result = result.multiply(radixToPower);
      result = result.add(exports.Integer.fromNumber(value));
    }
  }
  return result;
};


/**
 * A number used repeatedly in calculations.  This must appear before the first
 * call to the from* functions below.
 * @type {number}
 * @private
 */
exports.Integer.TWO_PWR_32_DBL_ = (1 << 16) * (1 << 16);


/** @type {exports.Integer} */
exports.Integer.ZERO = exports.Integer.fromInt(0);


/** @type {exports.Integer} */
exports.Integer.ONE = exports.Integer.fromInt(1);


/**
 * @type {exports.Integer}
 * @private
 */
exports.Integer.TWO_PWR_24_ = exports.Integer.fromInt(1 << 24);


/**
 * Returns the value, assuming it is a 32-bit integer.
 * @return {number} The corresponding int value.
 */
exports.Integer.prototype.toInt = function() {
  return this.bits_.length > 0 ? this.bits_[0] : this.sign_;
};

exports.Integer.prototype.encodeInt32 = function() {
  var number = this.toInt()
  var a, b, c, d, unsigned;
  unsigned = (number < 0) ? (number + 0x100000000) : number;
  a = Math.floor(unsigned / 0xffffff);
  unsigned &= 0xffffff;
  b = Math.floor(unsigned / 0xffff);
  unsigned &= 0xffff;
  c = Math.floor(unsigned / 0xff);
  unsigned &= 0xff;
  d = Math.floor(unsigned);
  return chr(d) + chr(c) + chr(b) + chr(a);
} 


/** @return {number} The closest floating-point representation to this value. */
exports.Integer.prototype.toNumber = function() {
  if (this.isNegative()) {
    return -this.negate().toNumber();
  } else {
    var val = 0;
    var pow = 1;
    for (var i = 0; i < this.bits_.length; i++) {
      val += this.getBitsUnsigned(i) * pow;
      pow *= exports.Integer.TWO_PWR_32_DBL_;
    }
    return val;
  }
};


/**
 * @param {number} opt_radix The radix in which the text should be written.
 * @return {string} The textual representation of this value.
 */
exports.Integer.prototype.toString = function(opt_radix) {
  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw Error('radix out of range: ' + radix);
  }

  if (this.isZero()) {
    return '0';
  } else if (this.isNegative()) {
    return '-' + this.negate().toString(radix);
  }

  // Do several (6) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated div.
  var radixToPower = exports.Integer.fromNumber(Math.pow(radix, 6));

  var rem = this;
  var result = '';
  while (true) {
    var remDiv = rem.divide(radixToPower);
    var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
    var digits = intval.toString(radix);

    rem = remDiv;
    if (rem.isZero()) {
      return digits + result;
    } else {
      while (digits.length < 6) {
        digits = '0' + digits;
      }
      result = '' + digits + result;
    }
  }
};


/**
 * Returns the index-th 32-bit (signed) piece of the exports.Integer according to
 * little-endian order (i.e., index 0 contains the smallest bits).
 * @param {number} index The index in question.
 * @return {number} The requested 32-bits as a signed number.
 */
exports.Integer.prototype.getBits = function(index) {
  if (index < 0) {
    return 0;  // Allowing this simplifies bit shifting operations below...
  } else if (index < this.bits_.length) {
    return this.bits_[index];
  } else {
    return this.sign_;
  }
};


/**
 * Returns the index-th 32-bit piece as an unsigned number.
 * @param {number} index The index in question.
 * @return {number} The requested 32-bits as an unsigned number.
 */
exports.Integer.prototype.getBitsUnsigned = function(index) {
  var val = this.getBits(index);
  return val >= 0 ? val : exports.Integer.TWO_PWR_32_DBL_ + val;
};


/** @return {number} The sign bit of this number, -1 or 0. */
exports.Integer.prototype.getSign = function() {
  return this.sign_;
};


/** @return {boolean} Whether this value is zero. */
exports.Integer.prototype.isZero = function() {
  if (this.sign_ != 0) {
    return false;
  }
  for (var i = 0; i < this.bits_.length; i++) {
    if (this.bits_[i] != 0) {
      return false;
    }
  }
  return true;
};


/** @return {boolean} Whether this value is negative. */
exports.Integer.prototype.isNegative = function() {
  return this.sign_ == -1;
};


/** @return {boolean} Whether this value is odd. */
exports.Integer.prototype.isOdd = function() {
  return (this.bits_.length == 0) && (this.sign_ == -1) ||
         (this.bits_.length > 0) && ((this.bits_[0] & 1) != 0);
};


/**
 * @param {exports.Integer} other exports.Integer to compare against.
 * @return {boolean} Whether this exports.Integer equals the other.
 */
exports.Integer.prototype.equals = function(other) {
  if (this.sign_ != other.sign_) {
    return false;
  }
  var len = Math.max(this.bits_.length, other.bits_.length);
  for (var i = 0; i < len; i++) {
    if (this.getBits(i) != other.getBits(i)) {
      return false;
    }
  }
  return true;
};


/**
 * @param {exports.Integer} other exports.Integer to compare against.
 * @return {boolean} Whether this exports.Integer does not equal the other.
 */
exports.Integer.prototype.notEquals = function(other) {
  return !this.equals(other);
};


/**
 * @param {exports.Integer} other exports.Integer to compare against.
 * @return {boolean} Whether this exports.Integer is greater than the other.
 */
exports.Integer.prototype.greaterThan = function(other) {
  return this.compare(other) > 0;
};


/**
 * @param {exports.Integer} other exports.Integer to compare against.
 * @return {boolean} Whether this exports.Integer is greater than or equal to the other.
 */
exports.Integer.prototype.greaterThanOrEqual = function(other) {
  return this.compare(other) >= 0;
};


/**
 * @param {exports.Integer} other exports.Integer to compare against.
 * @return {boolean} Whether this exports.Integer is less than the other.
 */
exports.Integer.prototype.lessThan = function(other) {
  return this.compare(other) < 0;
};


/**
 * @param {exports.Integer} other exports.Integer to compare against.
 * @return {boolean} Whether this exports.Integer is less than or equal to the other.
 */
exports.Integer.prototype.lessThanOrEqual = function(other) {
  return this.compare(other) <= 0;
};


/**
 * Compares this exports.Integer with the given one.
 * @param {exports.Integer} other exports.Integer to compare against.
 * @return {number} 0 if they are the same, 1 if the this is greater, and -1
 *     if the given one is greater.
 */
exports.Integer.prototype.compare = function(other) {
  var diff = this.subtract(other);
  if (diff.isNegative()) {
    return -1;
  } else if (diff.isZero()) {
    return 0;
  } else {
    return +1;
  }
};


/**
 * Returns an integer with only the first numBits bits of this value, sign
 * extended from the final bit.
 * @param {number} numBits The number of bits by which to shift.
 * @return {exports.Integer} The shorted integer value.
 */
exports.Integer.prototype.shorten = function(numBits) {
  var arr_index = (numBits - 1) >> 5;
  var bit_index = (numBits - 1) % 32;
  var bits = [];
  for (var i = 0; i < arr_index; i++) {
    bits[i] = this.getBits(i);
  }
  var sigBits = bit_index == 31 ? 0xFFFFFFFF : (1 << (bit_index + 1)) - 1;
  var val = this.getBits(arr_index) & sigBits;
  if (val & (1 << bit_index)) {
    val |= 0xFFFFFFFF - sigBits;
    bits[arr_index] = val;
    return new exports.Integer(bits, -1);
  } else {
    bits[arr_index] = val;
    return new exports.Integer(bits, 0);
  }
};


/** @return {exports.Integer} The negation of this value. */
exports.Integer.prototype.negate = function() {
  return this.not().add(exports.Integer.ONE);
};


/**
 * Returns the sum of this and the given exports.Integer.
 * @param {exports.Integer} other The exports.Integer to add to this.
 * @return {exports.Integer} The exports.Integer result.
 */
exports.Integer.prototype.add = function(other) {
  var len = Math.max(this.bits_.length, other.bits_.length);
  var arr = [];
  var carry = 0;

  for (var i = 0; i <= len; i++) {
    var a1 = this.getBits(i) >>> 16;
    var a0 = this.getBits(i) & 0xFFFF;

    var b1 = other.getBits(i) >>> 16;
    var b0 = other.getBits(i) & 0xFFFF;

    var c0 = carry + a0 + b0;
    var c1 = (c0 >>> 16) + a1 + b1;
    carry = c1 >>> 16;
    c0 &= 0xFFFF;
    c1 &= 0xFFFF;
    arr[i] = (c1 << 16) | c0;
  }
  return exports.Integer.fromBits(arr);
};


/**
 * Returns the difference of this and the given exports.Integer.
 * @param {exports.Integer} other The exports.Integer to subtract from this.
 * @return {exports.Integer} The exports.Integer result.
 */
exports.Integer.prototype.subtract = function(other) {
  return this.add(other.negate());
};


/**
 * Returns the product of this and the given exports.Integer.
 * @param {exports.Integer} other The exports.Integer to multiply against this.
 * @return {exports.Integer} The product of this and the other.
 */
exports.Integer.prototype.multiply = function(other) {
  if (this.isZero()) {
    return exports.Integer.ZERO;
  } else if (other.isZero()) {
    return exports.Integer.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().multiply(other.negate());
    } else {
      return this.negate().multiply(other).negate();
    }
  } else if (other.isNegative()) {
    return this.multiply(other.negate()).negate();
  }

  // If both numbers are small, use float multiplication
  if (this.lessThan(exports.Integer.TWO_PWR_24_) &&
      other.lessThan(exports.Integer.TWO_PWR_24_)) {
    return exports.Integer.fromNumber(this.toNumber() * other.toNumber());
  }

  // Fill in an array of 16-bit products.
  var len = this.bits_.length + other.bits_.length;
  var arr = [];
  for (var i = 0; i < 2 * len; i++) {
    arr[i] = 0;
  }
  for (var i = 0; i < this.bits_.length; i++) {
    for (var j = 0; j < other.bits_.length; j++) {
      var a1 = this.getBits(i) >>> 16;
      var a0 = this.getBits(i) & 0xFFFF;

      var b1 = other.getBits(j) >>> 16;
      var b0 = other.getBits(j) & 0xFFFF;

      arr[2 * i + 2 * j] += a0 * b0;
      exports.Integer.carry16_(arr, 2 * i + 2 * j);
      arr[2 * i + 2 * j + 1] += a1 * b0;
      exports.Integer.carry16_(arr, 2 * i + 2 * j + 1);
      arr[2 * i + 2 * j + 1] += a0 * b1;
      exports.Integer.carry16_(arr, 2 * i + 2 * j + 1);
      arr[2 * i + 2 * j + 2] += a1 * b1;
      exports.Integer.carry16_(arr, 2 * i + 2 * j + 2);
    }
  }

  // Combine the 16-bit values into 32-bit values.
  for (var i = 0; i < len; i++) {
    arr[i] = (arr[2 * i + 1] << 16) | arr[2 * i];
  }
  for (var i = len; i < 2 * len; i++) {
    arr[i] = 0;
  }
  return new exports.Integer(arr, 0);
};


/**
 * Carries any overflow from the given index into later entries.
 * @param {Array.<number>} bits Array of 16-bit values in little-endian order.
 * @param {number} index The index in question.
 * @private
 */
exports.Integer.carry16_ = function(bits, index) {
  while ((bits[index] & 0xFFFF) != bits[index]) {
    bits[index + 1] += bits[index] >>> 16;
    bits[index] &= 0xFFFF;
  }
};


/**
 * Returns this exports.Integer divided by the given one.
 * @param {exports.Integer} other Th exports.Integer to divide this by.
 * @return {exports.Integer} This value divided by the given one.
 */
exports.Integer.prototype.divide = function(other) {
  if (other.isZero()) {
    throw Error('division by zero');
  } else if (this.isZero()) {
    return exports.Integer.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().divide(other.negate());
    } else {
      return this.negate().divide(other).negate();
    }
  } else if (other.isNegative()) {
    return this.divide(other.negate()).negate();
  }

  // Repeat the following until the remainder is less than other:  find a
  // floating-point that approximates remainder / other *from below*, add this
  // into the result, and subtract it from the remainder.  It is critical that
  // the approximate value is less than or equal to the real value so that the
  // remainder never becomes negative.
  var res = exports.Integer.ZERO;
  var rem = this;
  while (rem.greaterThanOrEqual(other)) {
    // Approximate the result of division. This may be a little greater or
    // smaller than the actual value.
    var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

    // We will tweak the approximate result by changing it in the 48-th digit or
    // the smallest non-fractional digit, whichever is larger.
    var log2 = Math.ceil(Math.log(approx) / Math.LN2);
    var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

    // Decrease the approximation until it is smaller than the remainder.  Note
    // that if it is too large, the product overflows and is negative.
    var approxRes = exports.Integer.fromNumber(approx);
    var approxRem = approxRes.multiply(other);
    while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
      approx -= delta;
      approxRes = exports.Integer.fromNumber(approx);
      approxRem = approxRes.multiply(other);
    }

    // We know the answer can't be zero... and actually, zero would cause
    // infinite recursion since we would make no progress.
    if (approxRes.isZero()) {
      approxRes = exports.Integer.ONE;
    }

    res = res.add(approxRes);
    rem = rem.subtract(approxRem);
  }
  return res;
};


/**
 * Returns this exports.Integer modulo the given one.
 * @param {exports.Integer} other The exports.Integer by which to mod.
 * @return {exports.Integer} This value modulo the given one.
 */
exports.Integer.prototype.modulo = function(other) {
  return this.subtract(this.divide(other).multiply(other));
};


/** @return {exports.Integer} The bitwise-NOT of this value. */
exports.Integer.prototype.not = function() {
  var len = this.bits_.length;
  var arr = [];
  for (var i = 0; i < len; i++) {
    arr[i] = ~this.bits_[i];
  }
  return new exports.Integer(arr, ~this.sign_);
};


/**
 * Returns the bitwise-AND of this exports.Integer and the given one.
 * @param {exports.Integer} other The exports.Integer to AND with this.
 * @return {exports.Integer} The bitwise-AND of this and the other.
 */
exports.Integer.prototype.and = function(other) {
  var len = Math.max(this.bits_.length, other.bits_.length);
  var arr = [];
  for (var i = 0; i < len; i++) {
    arr[i] = this.getBits(i) & other.getBits(i);
  }
  return new exports.Integer(arr, this.sign_ & other.sign_);
};


/**
 * Returns the bitwise-OR of this exports.Integer and the given one.
 * @param {exports.Integer} other The exports.Integer to OR with this.
 * @return {exports.Integer} The bitwise-OR of this and the other.
 */
exports.Integer.prototype.or = function(other) {
  var len = Math.max(this.bits_.length, other.bits_.length);
  var arr = [];
  for (var i = 0; i < len; i++) {
    arr[i] = this.getBits(i) | other.getBits(i);
  }
  return new exports.Integer(arr, this.sign_ | other.sign_);
};


/**
 * Returns the bitwise-XOR of this exports.Integer and the given one.
 * @param {exports.Integer} other The exports.Integer to XOR with this.
 * @return {exports.Integer} The bitwise-XOR of this and the other.
 */
exports.Integer.prototype.xor = function(other) {
  var len = Math.max(this.bits_.length, other.bits_.length);
  var arr = [];
  for (var i = 0; i < len; i++) {
    arr[i] = this.getBits(i) ^ other.getBits(i);
  }
  return new exports.Integer(arr, this.sign_ ^ other.sign_);
};


/**
 * Returns this value with bits shifted to the left by the given amount.
 * @param {number} numBits The number of bits by which to shift.
 * @return {exports.Integer} This shifted to the left by the given amount.
 */
exports.Integer.prototype.shiftLeft = function(numBits) {
  var arr_delta = numBits >> 5;
  var bit_delta = numBits % 32;
  var len = this.bits_.length + arr_delta + (bit_delta > 0 ? 1 : 0);
  var arr = [];
  for (var i = 0; i < len; i++) {
    if (bit_delta > 0) {
      arr[i] = (this.getBits(i - arr_delta) << bit_delta) |
               (this.getBits(i - arr_delta - 1) >>> (32 - bit_delta));
    } else {
      arr[i] = this.getBits(i - arr_delta);
    }
  }
  return new exports.Integer(arr, this.sign_);
};


/**
 * Returns this value with bits shifted to the right by the given amount.
 * @param {number} numBits The number of bits by which to shift.
 * @return {exports.Integer} This shifted to the right by the given amount.
 */
exports.Integer.prototype.shiftRight = function(numBits) {
  var arr_delta = numBits >> 5;
  var bit_delta = numBits % 32;
  var len = this.bits_.length - arr_delta;
  var arr = [];
  for (var i = 0; i < len; i++) {
    if (bit_delta > 0) {
      arr[i] = (this.getBits(i + arr_delta) >>> bit_delta) |
               (this.getBits(i + arr_delta + 1) << (32 - bit_delta));
    } else {
      arr[i] = this.getBits(i + arr_delta);
    }
  }
  return new exports.Integer(arr, this.sign_);
};
