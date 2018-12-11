'use strict';

const assert = require('assert');

describe('SchemaType.cast() (gh-7045)', function() {
  let original = {};

  beforeEach(function() {
    original.objectid = Schema.ObjectId.cast();
  });

  afterEach(function() {
    Schema.ObjectId.cast(original.objectid);
  });

  it('handles objectid', function() {
    Schema.ObjectId.cast(v => {
      assert.ok(v == null || typeof v === 'string');
      return original.objectid(v);
    });

    const objectid = new Schema.ObjectId();

    let threw = false;
    try {
      objectid.cast(123);
    } catch (error) {
      console.log(error)
      assert.equal(error.name, 'CastError');
    }
    assert.ok(threw);
  });
});