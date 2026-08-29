'use strict';

const assert = require('assert');
const start = require('./common');

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

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('scalar casting from arrays', function() {
  const uuid = '09190f70-3d30-11e5-8814-0f4df9a59c41';
  const objectId = '0123456789abcdef01234567';
  const casterCases = [
    { name: 'BigInt', cast: castBigInt, value: '42' },
    { name: 'Boolean', cast: castBoolean, value: 'true' },
    { name: 'Date', cast: castDate, value: '2020-01-01', nestedArrayTarget: 'a date' },
    { name: 'Decimal128', cast: castDecimal128, value: '1.23' },
    { name: 'Double', cast: castDouble, value: '1.23', nestedArrayTarget: 'a Double' },
    { name: 'Int32', cast: castInt32, value: '42', nestedArrayTarget: 'an Int32' },
    { name: 'Number', cast: castNumber, value: '42' },
    { name: 'ObjectId', cast: castObjectId, value: objectId, nestedArrayTarget: 'an ObjectId' },
    { name: 'String', cast: castString, value: 42, preservesEmptyString: true },
    { name: 'UUID', cast: castUUID, value: uuid, nestedArrayTarget: 'a UUID' }
  ];

  for (const casterCase of casterCases) {
    describe(casterCase.name, function() {
      it('casts a single-element array like its element', function() {
        // Arrange
        const expected = casterCase.cast(casterCase.value);

        // Act
        const actual = casterCase.cast([casterCase.value]);

        // Assert
        assert.deepStrictEqual(actual, expected);
      });

      it('rejects empty and multi-element arrays', function() {
        // Arrange
        const invalidValues = [[], [casterCase.value, casterCase.value]];

        // Act & Assert
        for (const value of invalidValues) {
          assert.throws(() => casterCase.cast(value));
        }
      });

      it('preserves nullish casting semantics', function() {
        // Arrange
        const nullishValues = [null, undefined];

        for (const value of nullishValues) {
          const expected = casterCase.cast(value);

          // Act
          const actual = casterCase.cast([value]);

          // Assert
          assert.deepStrictEqual(actual, expected);
        }
      });

      it('rejects nested single-element arrays', function() {
        // Arrange
        const value = [[casterCase.value]];

        // Act & Assert
        if (casterCase.nestedArrayTarget == null) {
          assert.throws(() => casterCase.cast(value));
        } else {
          assert.throws(
            () => casterCase.cast(value),
            { message: `Nested arrays cannot be cast to ${casterCase.nestedArrayTarget}` }
          );
        }
      });
    });
  }

  for (const casterCase of casterCases.filter(casterCase => !casterCase.preservesEmptyString)) {
    it(`${casterCase.name} casts a single empty string to null`, function() {
      // Arrange
      const expected = casterCase.cast('');

      // Act
      const actual = casterCase.cast(['']);

      // Assert
      assert.strictEqual(expected, null);
      assert.strictEqual(actual, null);
      assert.strictEqual(actual, expected);
    });
  }

  it('preserves a single empty string for String', function() {
    // Arrange
    const expected = castString('');

    // Act
    const actual = castString(['']);

    // Assert
    assert.strictEqual(expected, '');
    assert.strictEqual(actual, '');
    assert.strictEqual(actual, expected);
  });

  it('reports required validation errors for single null elements', function() {
    // Arrange
    mongoose.deleteModel(/Article/);
    const Article = mongoose.model('Article', new Schema({
      title: { type: String, required: true }
    }));

    // Act
    const error = new Article({ title: [null] }).validateSync();

    // Assert
    assert.ok(error);
    assert.strictEqual(error.errors.title.name, 'ValidatorError');
    assert.strictEqual(error.errors.title.kind, 'required');
  });
});
