'use strict';

const assert = require('assert');
const isIndexSpecEqual = require('../../lib/helpers/indexes/isIndexSpecEqual');

describe('isIndexSpecEqual', function() {
  it('should return true for equal index specifications', () => {
    const spec1 = { name: 1, age: -1 };
    const spec2 = { name: 1, age: -1 };
    const result = isIndexSpecEqual(spec1, spec2);
    assert.strictEqual(result, true);
  });

  it('should return false for different key order', () => {
    const spec1 = { name: 1, age: -1 };
    const spec2 = { age: -1, name: 1 };
    const result = isIndexSpecEqual(spec1, spec2);
    assert.strictEqual(result, false);
  });

  it('should return false for different index keys', () => {
    const spec1 = { name: 1, age: -1 };
    const spec2 = { name: 1, dob: -1 };
    const result = isIndexSpecEqual(spec1, spec2);
    assert.strictEqual(result, false);
  });
});
