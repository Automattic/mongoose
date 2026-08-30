'use strict';

const assert = require('assert');

const castBigInt = require('../lib/cast/bigint');
const castBoolean = require('../lib/cast/boolean');
const castDate = require('../lib/cast/date');
const castDecimal128 = require('../lib/cast/decimal128');
const castDouble = require('../lib/cast/double');
const castInt32 = require('../lib/cast/int32');
const castNumber = require('../lib/cast/number');
const castObjectId = require('../lib/cast/objectid');
const castString = require('../lib/cast/string');
const castUUID = require('../lib/cast/uuid');

describe('casting empty strings', function() {
  const casterCases = [
    { name: 'BigInt', cast: castBigInt },
    { name: 'Boolean', cast: castBoolean },
    { name: 'Date', cast: castDate },
    { name: 'Decimal128', cast: castDecimal128 },
    { name: 'Double', cast: castDouble },
    { name: 'Int32', cast: castInt32 },
    { name: 'Number', cast: castNumber },
    { name: 'ObjectId', cast: castObjectId },
    { name: 'String', cast: castString, preservesEmptyString: true },
    { name: 'UUID', cast: castUUID }
  ];

  for (const casterCase of casterCases) {
    it(`${casterCase.name} casts a single empty string like an empty string`, function() {
      // Arrange
      const expected = casterCase.preservesEmptyString ? '' : null;

      // Act
      const direct = casterCase.cast('');
      const unboxed = casterCase.cast(['']);

      // Assert
      assert.strictEqual(direct, expected);
      assert.strictEqual(unboxed, expected);
      assert.strictEqual(unboxed, direct);
    });
  }
});
