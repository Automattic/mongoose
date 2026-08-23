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
  const { casterCases } = createTestContext();

  for (const casterCase of casterCases) {
    describe(casterCase.name, function() {
      it('casts a single-element array like its element', function() {
        // Arrange
        const expected = casterCase.cast(casterCase.value);

        // Act
        const actual = casterCase.cast([casterCase.value]);

        // Assert
        assert.deepStrictEqual(casterCase.normalize(actual), casterCase.normalize(expected));
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
          assert.deepStrictEqual(casterCase.normalize(actual), casterCase.normalize(expected));
        }
      });

      it('rejects nested single-element arrays', function() {
        // Arrange
        const value = [[casterCase.value]];

        // Act & Assert
        assert.throws(() => casterCase.cast(value));
      });
    });
  }

  for (const casterCase of casterCases.filter(casterCase => casterCase.emptyStringIsNull)) {
    it(`${casterCase.name} casts a single empty string like an empty string`, function() {
      // Arrange
      const expected = casterCase.cast('');

      // Act
      const actual = casterCase.cast(['']);

      // Assert
      assert.deepStrictEqual(casterCase.normalize(actual), casterCase.normalize(expected));
    });
  }

  it('reports required validation errors for single null elements', function() {
    // Arrange
    const { RequiredScalarValues, requiredPaths } = createTestContext();
    const values = Object.fromEntries(requiredPaths.map(path => [path, [null]]));

    // Act
    const error = new RequiredScalarValues(values).validateSync();

    // Assert
    assert.ok(error);
    for (const path of requiredPaths) {
      assert.strictEqual(error.errors[path].name, 'ValidatorError');
      assert.strictEqual(error.errors[path].kind, 'required');
    }
  });

  function createTestContext() {
    const uuid = '09190f70-3d30-11e5-8814-0f4df9a59c41';
    const objectId = '0123456789abcdef01234567';
    const casterCases = [
      { name: 'BigInt', cast: castBigInt, value: '42', emptyStringIsNull: true },
      { name: 'Boolean', cast: castBoolean, value: 'true' },
      { name: 'Date', cast: castDate, value: '2020-01-01', emptyStringIsNull: true, normalize: normalizeDate },
      { name: 'Decimal128', cast: castDecimal128, value: '1.23', normalize: normalizeBsonValue },
      { name: 'Double', cast: castDouble, value: '1.23', emptyStringIsNull: true, normalize: normalizeDouble },
      { name: 'Int32', cast: castInt32, value: '42', emptyStringIsNull: true },
      { name: 'Number', cast: castNumber, value: '42', emptyStringIsNull: true },
      { name: 'ObjectId', cast: castObjectId, value: objectId, normalize: normalizeBsonValue },
      { name: 'String', cast: castString, value: 42 },
      { name: 'UUID', cast: castUUID, value: uuid, normalize: normalizeBsonValue }
    ].map(casterCase => ({ normalize: identity, ...casterCase }));

    mongoose.deleteModel(/RequiredScalarValues/);
    const requiredScalarValuesSchema = new Schema({
      active: { type: Boolean, required: true },
      latitude: { type: Schema.Types.Double, required: true },
      ownerId: { type: Schema.Types.ObjectId, required: true },
      price: { type: Schema.Types.Decimal128, required: true },
      publishedAt: { type: Date, required: true },
      rating: { type: Number, required: true },
      requestId: { type: Schema.Types.UUID, required: true },
      retryCount: { type: Schema.Types.Int32, required: true },
      title: { type: String, required: true },
      viewCount: { type: BigInt, required: true }
    });
    const RequiredScalarValues = mongoose.model('RequiredScalarValues', requiredScalarValuesSchema);
    const requiredPaths = Object.keys(requiredScalarValuesSchema.paths).filter(path => path !== '_id');

    return { casterCases, RequiredScalarValues, requiredPaths };
  }

  function identity(value) {
    return value;
  }

  function normalizeDate(value) {
    return value == null ? value : value.valueOf();
  }

  function normalizeDouble(value) {
    return value == null ? value : value.valueOf();
  }

  function normalizeBsonValue(value) {
    return value == null ? value : value.toString();
  }
});
