'use strict';

const Schema = require('../lib/schema');
const assert = require('assert');

describe('SchemaType.cast() (gh-7045)', function() {
  const original = {};

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
      threw = true;
      assert.equal(error.name, 'CastError');
    }
    assert.ok(threw);
  });
});